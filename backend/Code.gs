/**
 * Velocity Travels – enquiry backend (Google Apps Script, bound to a Google Sheet).
 * Website form -> doPost -> save row -> email team -> email customer.
 * Rule: save first, email second. Personal emails and phone numbers live in the Settings tab, not here.
 */

var TZ = 'Asia/Kolkata';
var TAB = { leads: 'Leads', dash: 'Dashboard', settings: 'Settings', log: 'Log' };

var STATUSES = ['New', 'Contacted', 'Quoted', 'Booked', 'Completed', 'Lost', 'Spam'];
var OPEN = ['New', 'Contacted', 'Quoted'];

var TRIPS = {
  tour: 'Tour package', pilgrimage: 'Sabarimala / Pilgrimage', transfer: 'Airport / Railway transfer',
  event: 'Wedding / Event', vehicle: 'Vehicle hire', corporate: 'Corporate / B2B contract', other: 'Something else'
};
var PLACES = ['Munnar', 'Alleppey', 'Thekkady', 'Wayanad', 'Vagamon', 'Varkala', 'Athirappilly', 'Ooty', 'Kodaikanal', 'Kanyakumari', 'Help me choose',
  'Sabarimala', 'Erumeli', 'Pandalam', 'Guruvayur', 'Chottanikkara', 'Palani', 'Madurai', 'Rameswaram', 'Velankanni'];
var CODES = ['+91', '+971', '+966', '+974', '+968', '+965', '+973', '+1', '+44', '+61'];

/* Leads columns. Looked up by header text, so the team may move or add columns (but not rename these). */
var COLS = [
  ['Status', 105], ['Owner', 110], ['Follow-up', 105], ['Quote ₹', 95], ['Team notes', 220],
  ['Received', 150], ['Reference', 135], ['Name', 150], ['Phone', 150], ['WhatsApp', 85], ['Email', 190],
  ['Contact by', 95], ['Best time', 120], ['Trip type', 165], ['Pickup', 150], ['Destination', 180],
  ['Start', 100], ['End', 100], ['Time', 80], ['People', 150], ['Vehicle', 120], ['Details', 240], ['Customer notes', 260],
  ['Source', 110], ['Campaign', 130], ['Landing page', 130], ['Team email', 100], ['Receipt', 90], ['Request ID', 120], ['Data', 60]
];
var TEAM_COLS = 5;
var HIDDEN = ['Request ID', 'Data'];
var TEXT_COLS = ['Reference', 'Name', 'Phone', 'Email', 'Contact by', 'Best time', 'Trip type', 'Pickup', 'Destination', 'Time', 'People',
  'Vehicle', 'Details', 'Customer notes', 'Source', 'Campaign', 'Landing page', 'Request ID', 'Data'];

var LIMIT = { bodyBytes: 20000, minElapsedMs: 2500, perMinute: 20, perPhoneHour: 5, receiptsPerAddress: 2, receiptsPerDay: 30, reserveQuota: 30, maxTries: 5 };

var SETTINGS = [
  ['Team emails', '', 'Who gets new leads. Separate with commas. Each address counts toward your daily email limit.'],
  ['Owners', 'Partner 1, Partner 2, Partner 3', 'Names for the Owner dropdown. Run Velocity > Set up / repair after changing.'],
  ['Business name', 'Velocity Travels', 'Shown as the sender name.'],
  ['Phone', '+91 00000 00000', 'Shown to customers. Left out of emails until replaced.'],
  ['WhatsApp number', '910000000000', 'Country code and number, digits only. Left out of emails until replaced.'],
  ['Business email', 'hello@yourdomain.in', 'Where customer replies go. Left out until replaced.'],
  ['Website', 'https://www.yourdomain.in/', 'Left out of emails until replaced.'],
  ['Customer receipts', 'Yes', 'Yes or No. Emails the customer a copy if they gave an email.'],
  ['Daily digest', 'Yes', 'Yes or No. 8 AM email when something needs attention.']
];

/* ============================== Web endpoints ============================== */

function doPost(e) {
  try {
    var body = e && e.postData && e.postData.contents;
    if (!body || body.length > LIMIT.bodyBytes) return json_({ ok: false, error: 'bad_request' });
    var data;
    try { data = JSON.parse(body); } catch (err) { return json_({ ok: false, error: 'bad_request' }); }
    return json_(handleEnquiry(data));
  } catch (err) {
    log_('error', 'doPost: ' + err.message);
    return json_({ ok: false, error: 'server_error' });
  }
}

/** ?check=<requestId> answers only whether that request was saved. Never returns lead data. */
function doGet(e) {
  var id = e && e.parameter && e.parameter.check;
  if (id !== undefined) {
    try { return json_({ ok: true, saved: validId_(id) && findRequestRow_(id) > 0 }); }
    catch (err) { return json_({ ok: false, saved: false }); }
  }
  return json_({ ok: true, service: 'velocity-enquiries' });
}

function handleEnquiry(data, opts) {
  opts = opts || {};
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { ok: false, error: 'bad_request' };
  if (str_(data.website, 200)) { log_('blocked', 'honeypot'); return { ok: true, reference: str_(data.reference, 20) }; }

  var res = clean_(data);
  if (res.error) return { ok: false, error: 'invalid', field: res.error };
  var lead = res.lead;

  if (!opts.test) {
    if (!(Number(data.elapsed) >= LIMIT.minElapsedMs)) { log_('blocked', 'too fast'); return { ok: false, error: 'retry' }; }
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  var row;
  try {
    var existing = findRequestRow_(lead.requestId);
    if (existing > 0) return { ok: true, reference: readCell_(existing, 'Reference'), duplicate: true };
    if (!opts.test) {
      if (overLimit_('all', LIMIT.perMinute, 60)) { log_('blocked', 'rate limit: overall'); return { ok: false, error: 'busy' }; }
      if (overLimit_('p' + hash_(lead.code + lead.phone), LIMIT.perPhoneHour, 3600)) { log_('blocked', 'rate limit: phone'); return { ok: false, error: 'busy' }; }
    }
    row = saveLead_(lead);
  } finally {
    lock.releaseLock();
  }

  /* The lead is safe from here on: email problems must never turn into a failure for the customer. */
  try { sendEmails_(lead, row, opts); } catch (err) { log_('error', 'emails: ' + err.message); }
  return { ok: true, reference: lead.reference };
}

/* ============================== Validation ============================== */

function clean_(d) {
  var L = {};
  if (!validId_(d.requestId)) return { error: 'requestId' };
  L.requestId = d.requestId;
  L.reference = /^VT-\d{6}-\d{4}$/.test(d.reference) ? d.reference : newReference_();

  if (!Object.prototype.hasOwnProperty.call(TRIPS, d.trip)) return { error: 'trip' };
  L.trip = d.trip;
  L.tripLabel = TRIPS[d.trip];

  L.name = str_(d.name, 80);
  if (L.name.length < 2) return { error: 'name' };

  L.code = str_(d.code, 5);
  if (CODES.indexOf(L.code) < 0) return { error: 'phone' };
  L.phone = str_(d.phone, 30).replace(/\D/g, '');
  if (L.code === '+91') {
    if (L.phone.length === 12 && L.phone.slice(0, 2) === '91') L.phone = L.phone.slice(2);
    else if (L.phone.length === 11 && L.phone[0] === '0') L.phone = L.phone.slice(1);
    if (!/^[6-9]\d{9}$/.test(L.phone)) return { error: 'phone' };
  } else if (L.phone.length < 6 || L.phone.length > 15) return { error: 'phone' };

  L.email = str_(d.email, 120).toLowerCase();
  if (L.email && !/^[^\s@<>(),;:"\[\]\\]+@[^\s@<>(),;:"\[\]\\]+\.[^\s@<>(),;:"\[\]\\]{2,}$/.test(L.email)) return { error: 'email' };
  L.contact = oneOf_(d.contact, ['WhatsApp', 'Call', 'Email'], 'WhatsApp');
  if (L.contact === 'Email' && !L.email) return { error: 'email' };
  L.onWhatsApp = d.onWhatsApp === true;
  L.best = list_(d.best, ['Morning', 'Afternoon', 'Evening']);

  L.places = list_(d.places, PLACES);
  L.startDate = date_(d.startDate);
  L.endDate = date_(d.endDate);
  if (L.startDate && L.endDate && L.endDate < L.startDate) L.endDate = '';
  L.datesOpen = d.datesOpen === true;
  if (L.datesOpen) L.startDate = L.endDate = '';
  L.time = /^([01]\d|2[0-3]):[0-5]\d$/.test(d.time) ? d.time : '';
  L.adults = int_(d.adults, 0, 99);
  L.children = int_(d.children, 0, 99);
  L.bags = int_(d.bags, 0, 99);
  L.vehicle = oneOf_(d.vehicle, ['Sedan', 'SUV', 'Tempo Traveller', 'Bus'], '');
  L.virtualQ = oneOf_(d.virtualQ, ['Yes', 'Not yet'], '');
  L.gst = d.gst === true;

  [['service', 60], ['need', 60], ['company', 120], ['pickup', 120], ['otherPlaces', 160], ['drop', 120], ['venue', 160],
    ['flight', 20], ['guests', 120], ['people', 120], ['shifts', 160]].forEach(function (f) { L[f[0]] = str_(d[f[0]], f[1]); });
  L.notes = text_(d.notes, 800);

  var s = d.source && typeof d.source === 'object' ? d.source : {};
  L.source = sourceName_(str_(s.source, 60), str_(s.referrer, 100));
  L.campaign = [str_(s.medium, 60), str_(s.campaign, 80)].filter(String).join(' / ');
  L.landing = str_(s.landing, 120);
  return { lead: L };
}

function str_(v, max) {
  if (typeof v !== 'string' && typeof v !== 'number') return '';
  return String(v).replace(/[\u0000-\u001f\u007f\u200b\u200e\u200f\u2028-\u202e\u2066-\u2069]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}
function text_(v, max) { /* keeps line breaks */
  if (typeof v !== 'string') return '';
  return v.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000b-\u001f\u007f\u200b\u200e\u200f\u2028-\u202e\u2066-\u2069]/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);
}
function oneOf_(v, allowed, dflt) { return allowed.indexOf(v) > -1 ? v : dflt; }
function list_(v, allowed) { return Array.isArray(v) ? allowed.filter(function (a) { return v.indexOf(a) > -1; }) : []; }
function int_(v, min, max) { var n = parseInt(v, 10); return isNaN(n) || n < min || n > max ? 0 : n; }
function date_(v) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m || +m[1] < 2024 || +m[1] > 2100) return '';
  var d = new Date(Date.UTC(+m[1], m[2] - 1, +m[3]));
  return d.getUTCMonth() === m[2] - 1 && d.getUTCDate() === +m[3] ? v : '';
}
function validId_(id) { return typeof id === 'string' && /^[A-Za-z0-9-]{8,64}$/.test(id); }
function newReference_() { return 'VT-' + Utilities.formatDate(new Date(), TZ, 'yyMMdd') + '-' + (1000 + Math.floor(Math.random() * 9000)); }
function sourceName_(utm, ref) {
  var v = (utm || ref || '').toLowerCase();
  var known = [['instagram', 'Instagram'], ['facebook', 'Facebook'], ['fb', 'Facebook'], ['whatsapp', 'WhatsApp'], ['wa.me', 'WhatsApp'], ['google', 'Google'], ['bing', 'Bing'], ['youtube', 'YouTube'], ['justdial', 'Justdial']];
  for (var i = 0; i < known.length; i++) if (v.indexOf(known[i][0]) > -1) return known[i][1];
  return utm || ref || 'Direct';
}

/* ============================== Sheet ============================== */

function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }
function leads_() {
  var sh = ss_().getSheetByName(TAB.leads);
  if (!sh) throw new Error('Leads tab missing: run Velocity > Set up / repair');
  return sh;
}
function headerMap_(sh) {
  var map = {}, h = sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0];
  h.forEach(function (t, i) { if (t && !map[t]) map[t] = i + 1; });
  return map;
}
function readCell_(row, header) { var sh = leads_(); return sh.getRange(row, headerMap_(sh)[header]).getValue(); }
/** Finds the row again by request ID, because someone may sort or delete rows while an email is sending. */
function setStatus_(L, header, value) {
  var row = findRequestRow_(L.requestId), sh = leads_();
  if (row) sh.getRange(row, headerMap_(sh)[header]).setValue(value);
}

function findRequestRow_(id) {
  var sh = leads_(), col = headerMap_(sh)['Request ID'], last = sh.getLastRow();
  if (last < 2) return 0;
  var hit = sh.getRange(2, col, last - 1, 1).createTextFinder(id).matchEntireCell(true).findNext();
  return hit ? hit.getRow() : 0;
}

/** Anything a customer typed must never run as a formula. */
function safe_(v) { return typeof v === 'string' && /^[=+\-@\t\r']/.test(v) ? "'" + v : v; }

function sheetDate_(iso) { return iso ? Utilities.parseDate(iso, TZ, 'yyyy-MM-dd') : ''; }
function prettyDate_(iso) { return iso ? Utilities.formatDate(sheetDate_(iso), TZ, 'd MMM yyyy') : ''; }
function prettyTime_(t) { if (!t) return ''; var h = +t.slice(0, 2); return (h % 12 || 12) + t.slice(2) + (h < 12 ? ' AM' : ' PM'); }
function prettyPhone_(L) { return '(' + L.code + ') ' + (L.code === '+91' ? L.phone.slice(0, 5) + ' ' + L.phone.slice(5) : L.phone); }
function destination_(L) {
  return [L.drop, L.venue].concat(L.places, L.otherPlaces).filter(String).join(', ');
}
function people_(L) {
  var p = L.adults ? L.adults + (L.adults === 1 ? ' adult' : ' adults') + (L.children ? ', ' + L.children + (L.children === 1 ? ' child' : ' children') : '') : '';
  return [p, L.guests, L.people].filter(String).join('; ');
}
function datesText_(L) {
  if (L.datesOpen) return 'Not fixed yet';
  return [prettyDate_(L.startDate), prettyDate_(L.endDate)].filter(String).join(' – ');
}
function details_(L) {
  var d = [];
  if (L.service || L.need) d.push(['Service', L.service || L.need]);
  if (L.company) d.push(['Company', L.company]);
  if (L.datesOpen) d.push(['Dates', 'Not fixed yet']);
  if (L.bags) d.push(['Bags', String(L.bags)]);
  if (L.flight) d.push(['Flight / train', L.flight.toUpperCase()]);
  if (L.shifts) d.push(['Shifts / routes', L.shifts]);
  if (L.virtualQ) d.push(['Virtual-Q booked', L.virtualQ]);
  if (L.gst) d.push(['GST invoice', 'Needed']);
  return d;
}
function waLink_(L, text) { return 'https://wa.me/' + L.code.slice(1) + L.phone + (text ? '?text=' + encodeURIComponent(text) : ''); }
function greeting_(L) {
  return 'Hi ' + L.name.split(' ')[0] + ', this is ' + setting_('Business name') + '. Thank you for your enquiry (' + L.reference + ') about ' + L.tripLabel.toLowerCase().replace('sabarimala', 'Sabarimala') + '.';
}

function saveLead_(L) {
  var sh = leads_(), map = headerMap_(sh), row = Math.max(2, sh.getLastRow() + 1);
  if (row > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), 200);
  var vals = {
    'Status': 'New', 'Received': new Date(), 'Reference': L.reference, 'Name': L.name, 'Phone': prettyPhone_(L), 'Email': L.email,
    'Contact by': L.contact, 'Best time': L.best.join(', '), 'Trip type': L.tripLabel, 'Pickup': L.pickup, 'Destination': destination_(L),
    'Start': sheetDate_(L.startDate), 'End': sheetDate_(L.endDate), 'Time': prettyTime_(L.time), 'People': people_(L), 'Vehicle': L.vehicle,
    'Details': details_(L).map(function (x) { return x[0] + ': ' + x[1]; }).join('\n'), 'Customer notes': L.notes,
    'Source': L.source, 'Campaign': L.campaign, 'Landing page': L.landing, 'Team email': 'Pending 0', 'Receipt': '',
    'Request ID': L.requestId, 'Data': JSON.stringify(L)
  };
  var width = sh.getLastColumn(), out = [], fmt = [];
  for (var c = 0; c < width; c++) { out.push(''); fmt.push('General'); }
  Object.keys(map).forEach(function (h) {
    var i = map[h] - 1;
    if (vals[h] !== undefined) out[i] = safe_(vals[h]);
    if (TEXT_COLS.indexOf(h) > -1) fmt[i] = '@';
    if (h === 'Start' || h === 'End' || h === 'Follow-up') fmt[i] = 'd mmm yyyy';
    if (h === 'Received') fmt[i] = 'd mmm yyyy, h:mm am/pm';
    if (h === 'Quote ₹') fmt[i] = '[$₹]#,##0';
  });
  var range = sh.getRange(row, 1, 1, width);
  range.setNumberFormats([fmt]);
  range.setValues([out]);
  if (L.onWhatsApp && map['WhatsApp']) {
    sh.getRange(row, map['WhatsApp']).setFormula('=HYPERLINK("' + waLink_(L, greeting_(L)).replace(/"/g, '%22') + '","Chat")');
  }
  SpreadsheetApp.flush();
  return row;
}

/* ============================== Limits, settings, log ============================== */

function overLimit_(key, max, seconds) {
  var cache = CacheService.getScriptCache(), k = 'rl:' + key + ':' + Math.floor(Date.now() / 1000 / seconds), n = Number(cache.get(k) || 0) + 1;
  cache.put(k, String(n), Math.min(seconds + 5, 21600));
  return n > max;
}
function hash_(s) {
  var h = 5381;
  for (var i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}
var settingsCache_ = null;
function setting_(key) {
  if (!settingsCache_) {
    settingsCache_ = {};
    SETTINGS.forEach(function (s) { settingsCache_[s[0]] = s[1]; });
    var sh = ss_().getSheetByName(TAB.settings);
    if (sh && sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues().forEach(function (r) { if (r[0]) settingsCache_[r[0]] = String(r[1]).trim(); });
  }
  return settingsCache_[key] || '';
}
function real_(key) { /* '' while the value is still a placeholder */
  var v = setting_(key);
  return /0{5}|yourdomain/.test(v.replace(/\s/g, '')) ? '' : v;
}
function yes_(key) { return /^(y|yes|true|on)$/i.test(setting_(key)); }
function teamEmails_() { return setting_('Team emails').split(/[,;\s]+/).filter(function (x) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x); }).slice(0, 10); }

/** Keep personal details out of this tab. */
function log_(type, msg) {
  try {
    var sh = ss_().getSheetByName(TAB.log);
    if (!sh) return;
    sh.appendRow([new Date(), type, safe_(String(msg).replace(/[^\s@]+@[^\s@]+/g, '[email]').replace(/\+?\d[\d\s-]{7,}/g, '[number]').slice(0, 300))]);
    if (sh.getLastRow() > 520) sh.deleteRows(2, sh.getLastRow() - 500);
  } catch (err) { /* logging must never break a lead */ }
}
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/* ============================== Emails ============================== */

function sendEmails_(L, row, opts) {
  trySendTeam_(L, row, 0);
  var r = 'Skipped';
  try { r = sendReceipt_(L, opts); } catch (err) { r = 'Failed'; log_('error', 'receipt: ' + err.message); }
  setStatus_(L, 'Receipt', r);
}

function trySendTeam_(L, row, tries) {
  var status;
  try {
    var to = teamEmails_();
    if (!to.length) throw new Error('no Team emails in Settings');
    var m = teamEmail_(L, row), msg = { to: to.join(','), subject: m.subject, body: m.text, htmlBody: m.html, name: setting_('Business name') };
    if (L.email) msg.replyTo = L.email;
    MailApp.sendEmail(msg);
    status = 'Sent';
  } catch (err) {
    status = tries + 1 >= LIMIT.maxTries ? 'Failed' : 'Pending ' + (tries + 1);
    log_('error', 'team email: ' + err.message);
  }
  setStatus_(L, 'Team email', status);
  return status === 'Sent';
}

/** Time trigger: resend anything that did not go out. */
function retryEmails() {
  var lock = LockService.getUserLock(); /* not the script lock: retries must not hold up new leads */
  if (!lock.tryLock(1000)) return 0;
  var sent = 0;
  try {
    var sh = leads_(), map = headerMap_(sh), last = sh.getLastRow();
    if (last < 2) return 0;
    var st = sh.getRange(2, map['Team email'], last - 1, 1).getValues(), rec = sh.getRange(2, map['Received'], last - 1, 1).getValues();
    for (var i = 0; i < st.length; i++) {
      var m = /^Pending (\d+)$/.exec(st[i][0]);
      if (!m) continue;
      if (Date.now() - new Date(rec[i][0]).getTime() < 120000) continue; /* may still be sending */
      var L;
      try { L = JSON.parse(sh.getRange(i + 2, map['Data']).getValue()); } catch (e) { sh.getRange(i + 2, map['Team email']).setValue('Failed'); continue; }
      if (trySendTeam_(L, i + 2, +m[1])) sent++;
    }
  } finally { lock.releaseLock(); }
  return sent;
}

function h_(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function line_(s) { return String(s).replace(/[\r\n]+/g, ' ').slice(0, 180); }

function leadRows_(L) {
  var r = [['Trip', L.tripLabel], ['Pickup', L.pickup], ['Destination', destination_(L)], ['Dates', L.datesOpen ? '' : datesText_(L)], ['Time', prettyTime_(L.time)],
    ['People', people_(L)], ['Vehicle', L.vehicle]].concat(details_(L), [['Notes', L.notes], ['Name', L.name], ['Phone', prettyPhone_(L) + (L.onWhatsApp ? ' (WhatsApp)' : '')],
    ['Email', L.email], ['Contact by', [L.contact, L.best.join(', ')].filter(String).join(' · ')], ['Found us via', [L.source, L.campaign].filter(String).join(' – ')]]);
  return r.filter(function (x) { return x[1]; });
}
function tableHtml_(rows) {
  return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">' + rows.map(function (r) {
    return '<tr><td style="padding:8px 12px 8px 0;color:#5B6475;font-size:14px;vertical-align:top;white-space:nowrap;border-bottom:1px solid #E6EAF1">' + h_(r[0]) +
      '</td><td style="padding:8px 0;color:#0F1829;font-size:15px;font-weight:600;border-bottom:1px solid #E6EAF1">' + h_(r[1]).replace(/\n/g, '<br>') + '</td></tr>';
  }).join('') + '</table>';
}
function button_(href, label, bg, color) {
  return '<a href="' + h_(href) + '" style="display:inline-block;margin:0 8px 10px 0;padding:13px 20px;border-radius:999px;background:' + bg + ';color:' + color + ';font-weight:700;font-size:15px;text-decoration:none">' + h_(label) + '</a>';
}
function shell_(kicker, title, inner, foot) {
  return '<div style="margin:0;padding:20px 12px;background:#FAF8F4;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif">' +
    '<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #E6EAF1">' +
    '<div style="padding:20px 24px;background:#0B2545"><div style="color:#E4CB8A;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase">' + h_(kicker) +
    '</div><div style="margin-top:6px;color:#ffffff;font-size:22px;line-height:1.25;font-weight:800">' + h_(title) + '</div></div>' +
    '<div style="padding:22px 24px">' + inner + '</div>' + (foot ? '<div style="padding:16px 24px;background:#F6F8FB;color:#5B6475;font-size:13px;line-height:1.5">' + foot + '</div>' : '') + '</div></div>';
}

function teamEmail_(L, row) {
  var short = { pilgrimage: 'Sabarimala / Pilgrimage', transfer: 'Transfer', event: 'Event', corporate: 'Corporate', other: 'Other' }[L.trip] || L.tripLabel;
  var subject = line_('New lead: ' + [short, L.name, L.datesOpen ? 'dates open' : datesText_(L), people_(L)].filter(String).join(' · ') + ' (' + L.reference + ')');
  var sh = leads_(), url = ss_().getUrl() + '#gid=' + sh.getSheetId() + '&range=A' + row, rows = leadRows_(L);
  var tel = 'tel:' + L.code + L.phone;
  var inner = '<div style="margin-bottom:10px">' + (L.onWhatsApp ? button_(waLink_(L, greeting_(L)), 'WhatsApp ' + L.name.split(' ')[0], '#1E9E4A', '#ffffff') : '') +
    button_(tel, 'Call', '#0B2545', '#ffffff') + button_(url, 'Open in Sheet', '#EEF3FA', '#0B2545') + '</div>' + tableHtml_(rows);
  var text = rows.map(function (r) { return r[0] + ': ' + r[1]; }).join('\n') + '\n\nWhatsApp: ' + waLink_(L) + '\nCall: ' + tel + '\nSheet: ' + url;
  return { subject: subject, text: text, html: shell_('New lead · ' + L.reference, L.name + ' – ' + L.tripLabel, inner, L.email ? 'Reply to this email to answer ' + h_(L.name.split(' ')[0]) + ' directly.' : 'No email given. Use WhatsApp or call.') };
}

/** Customer copy. Contains only choices from our own lists, so the form can't be used to send strangers someone's text. */
function sendReceipt_(L, opts) {
  if (!L.email) return '–';
  if (!yes_('Customer receipts')) return 'Off';
  if (MailApp.getRemainingDailyQuota() - 1 < LIMIT.reserveQuota) return 'Quota';
  if (!(opts && opts.test)) {
    if (overLimit_('r' + hash_(L.email), LIMIT.receiptsPerAddress, 21600)) return 'Limited';
    var props = PropertiesService.getScriptProperties(), day = Utilities.formatDate(new Date(), TZ, 'yyyyMMdd'), cur = (props.getProperty('receipts') || '').split(':');
    var n = cur[0] === day ? Number(cur[1]) : 0;
    if (n >= LIMIT.receiptsPerDay) return 'Limited';
    props.setProperty('receipts', day + ':' + (n + 1));
  }
  var m = receiptEmail_(L), msg = { to: L.email, subject: m.subject, body: m.text, htmlBody: m.html, name: setting_('Business name') };
  if (real_('Business email')) msg.replyTo = real_('Business email');
  MailApp.sendEmail(msg);
  return 'Sent';
}
function receiptEmail_(L) {
  var first = L.name.split(' ')[0], biz = setting_('Business name');
  if (!/^[A-Za-z\u00c0-\u024f\u0900-\u0dff\u200c\u200d'-]{2,20}$/.test(first)) first = '';
  var people = L.adults ? people_({ adults: L.adults, children: L.children, guests: '', people: '' }) : '';
  var rows = [['Trip', L.tripLabel], ['Places', L.places.filter(function (p) { return p !== 'Help me choose'; }).join(', ')], ['Dates', datesText_(L)], ['Time', prettyTime_(L.time)], ['Travellers', people],
    ['Vehicle', L.vehicle], ['Reference', L.reference]].filter(function (x) { return x[1]; });
  var how = { WhatsApp: 'on WhatsApp', Call: 'by phone', Email: 'by email' }[L.contact];
  var ph = real_('Phone'), wa = real_('WhatsApp number').replace(/\D/g, ''), site = real_('Website');
  var btns = (wa ? button_('https://wa.me/' + wa + '?text=' + encodeURIComponent('Hi ' + biz + '! My reference is ' + L.reference + '.'), 'WhatsApp us', '#1E9E4A', '#ffffff') : '') + (ph ? button_('tel:' + ph.replace(/[^\d+]/g, ''), 'Call ' + ph, '#0B2545', '#ffffff') : '');
  var p = 'margin:0 0 16px;color:#3D475A;font-size:16px;line-height:1.6';
  var inner = '<p style="' + p + '">We\'ve received your trip request and our team is preparing your quote. We\'ll reach you ' + how + '.</p>' +
    '<div style="margin:0 0 20px;padding:6px 18px 12px;border-radius:16px;background:#FAF8F4;border:1px dashed #C8A24A">' + tableHtml_(rows) + '</div>' +
    (btns ? '<p style="' + p + '">Need it sooner? Talk to us:</p><div>' + btns + '</div>' : '');
  var foot = 'You\'re getting this because this address was entered on our enquiry form. If that wasn\'t you, please ignore this email.' + (site ? '<br>' + h_(biz) + ' · ' + h_(site) : '<br>' + h_(biz));
  var title = 'Thank you' + (first ? ', ' + first : '') + '! Your request is in.';
  return { subject: line_('We\'ve received your trip request (' + L.reference + ')'), html: shell_(biz, title, inner, foot),
    text: title + '\n\nOur team is preparing your quote. We\'ll reach you ' + how + '.\n\n' + rows.map(function (r) { return r[0] + ': ' + r[1]; }).join('\n') + (ph ? '\n\nCall: ' + ph : '') + '\n\n' + biz };
}

/** Time trigger, 8 AM India time. Sends only when something needs attention. */
function dailyDigest() {
  if (!yes_('Daily digest')) return false;
  var to = teamEmails_(), sh = leads_(), map = headerMap_(sh), last = sh.getLastRow();
  if (!to.length || last < 2) return false;
  var rows = sh.getRange(2, 1, last - 1, sh.getLastColumn()).getValues(), today = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  var g = function (r, h) { return r[map[h] - 1]; }, groups = [['New, not contacted yet', []], ['Follow-up due', []], ['Quoted, waiting for an answer', []]];
  rows.forEach(function (r) {
    var s = g(r, 'Status'), f = g(r, 'Follow-up');
    if (OPEN.indexOf(s) < 0) return;
    var item = [g(r, 'Name'), g(r, 'Trip type'), g(r, 'Phone'), g(r, 'Owner') || 'no owner', g(r, 'Reference')].join(' · ');
    if (f instanceof Date && Utilities.formatDate(f, TZ, 'yyyy-MM-dd') <= today) groups[1][1].push(item);
    else if (s === 'New') groups[0][1].push(item);
    else if (s === 'Quoted') groups[2][1].push(item);
  });
  var total = groups[0][1].length + groups[1][1].length + groups[2][1].length;
  if (!total) return false;
  var inner = groups.filter(function (x) { return x[1].length; }).map(function (x) {
    return '<h3 style="margin:0 0 8px;color:#0B2545;font-size:16px">' + h_(x[0]) + ' (' + x[1].length + ')</h3><ul style="margin:0 0 20px;padding-left:18px;color:#3D475A;font-size:15px;line-height:1.6">' +
      x[1].slice(0, 25).map(function (i) { return '<li>' + h_(i) + '</li>'; }).join('') + (x[1].length > 25 ? '<li>and ' + (x[1].length - 25) + ' more</li>' : '') + '</ul>';
  }).join('') + button_(ss_().getUrl(), 'Open the Sheet', '#0B2545', '#ffffff');
  var text = groups.map(function (x) { return x[1].length ? x[0] + ' (' + x[1].length + ')\n' + x[1].slice(0, 25).join('\n') : ''; }).filter(String).join('\n\n');
  MailApp.sendEmail({ to: to.join(','), subject: total + (total === 1 ? ' lead needs' : ' leads need') + ' attention today', body: text, htmlBody: shell_('Morning summary', total + (total === 1 ? ' lead needs' : ' leads need') + ' attention', inner, ''), name: setting_('Business name') });
  return true;
}

/* ============================== Menu and set up ============================== */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Velocity').addItem('Set up / repair', 'setup').addItem('Send test lead', 'sendTestLead').addItem('Retry unsent emails', 'retryEmails').addToUi();
}

/** Safe to run again at any time: it adds what is missing and never deletes leads or settings. */
function setup() {
  var ss = ss_();
  ss.setSpreadsheetTimeZone(TZ);
  ss.setSpreadsheetLocale('en_IN');
  settingsCache_ = null;
  setupSettings_(ss);
  settingsCache_ = null;
  var leads = setupLeads_(ss);
  setupLog_(ss);
  setupDashboard_(ss, leads);
  ['retryEmails', 'dailyDigest'].forEach(function (fn) {
    ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === fn) ScriptApp.deleteTrigger(t); });
  });
  ScriptApp.newTrigger('retryEmails').timeBased().everyMinutes(10).create();
  ScriptApp.newTrigger('dailyDigest').timeBased().atHour(8).everyDays(1).inTimezone(TZ).create();
  ss.toast(teamEmails_().length ? 'Everything is ready.' : 'Almost done: fill in "Team emails" on the Settings tab.', 'Velocity Travels', 10);
}

function tab_(ss, name) {
  var sh = ss.getSheetByName(name);
  if (sh) return sh;
  var all = ss.getSheets();
  if (name === TAB.leads) for (var i = 0; i < all.length; i++) if (all[i].getLastRow() === 0 && /^(Sheet|शीट|ഷീറ്റ്)\s?1$/.test(all[i].getName())) return all[i].setName(name);
  return ss.insertSheet(name);
}

function setupSettings_(ss) {
  var sh = tab_(ss, TAB.settings), have = {};
  if (sh.getLastRow() === 0) sh.getRange(1, 1, 1, 3).setValues([['Setting', 'Value', 'What it does']]);
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().forEach(function (r) { have[r[0]] = true; });
  SETTINGS.forEach(function (s) {
    if (have[s[0]]) return;
    var r = sh.getLastRow() + 1;
    sh.getRange(r, 2).setNumberFormat('@');
    sh.getRange(r, 1, 1, 3).setValues([[s[0], s[1], s[2]]]);
  });
  header_(sh, 3);
  sh.setColumnWidth(1, 170).setColumnWidth(2, 320).setColumnWidth(3, 480);
}

function setupLog_(ss) {
  var sh = tab_(ss, TAB.log);
  if (sh.getLastRow() === 0) sh.getRange(1, 1, 1, 3).setValues([['When', 'Type', 'What happened']]);
  header_(sh, 3);
  sh.setColumnWidth(1, 160).setColumnWidth(2, 90).setColumnWidth(3, 560);
}

function header_(sh, n) {
  sh.getRange(1, 1, 1, n).setFontWeight('bold').setBackground('#0B2545').setFontColor('#FFFFFF').setVerticalAlignment('middle');
  sh.setFrozenRows(1);
  sh.setRowHeight(1, 34);
}

function setupLeads_(ss) {
  var sh = tab_(ss, TAB.leads), map = sh.getLastRow() ? headerMap_(sh) : {};
  COLS.forEach(function (c) {
    if (map[c[0]]) return;
    var at = sh.getLastColumn() + 1;
    if (at > sh.getMaxColumns()) sh.insertColumnAfter(sh.getMaxColumns());
    sh.getRange(1, at).setValue(c[0]);
    sh.setColumnWidth(at, c[1]);
    map[c[0]] = at;
  });
  var width = sh.getLastColumn(), rows = sh.getMaxRows() - 1, col = function (h) { return sh.getRange(2, map[h], rows, 1); };
  header_(sh, width);
  sh.setFrozenColumns(1);
  sh.getRange(1, 1, 1, Math.min(TEAM_COLS, width)).setBackground('#8A6A1F');
  var rule = function (list, strict) { return SpreadsheetApp.newDataValidation().requireValueInList(list, true).setAllowInvalid(!strict).build(); };
  var owners = setting_('Owners').split(',').map(function (x) { return x.trim(); }).filter(String);
  col('Status').setDataValidation(rule(STATUSES, true));
  if (owners.length) col('Owner').setDataValidation(rule(owners, false));
  col('Follow-up').setDataValidation(SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(false).build()).setNumberFormat('d mmm yyyy');
  col('Quote ₹').setNumberFormat('[$₹]#,##0');
  sh.getRange(2, 1, rows, width).setVerticalAlignment('top');
  ['Team notes', 'Details', 'Customer notes', 'Destination'].forEach(function (h) { col(h).setWrap(true); });
  HIDDEN.forEach(function (h) { sh.hideColumns(map[h]); });

  var L = function (h) { return '$' + letter_(map[h]) + '2'; }, all = sh.getRange(2, 1, rows, width), st = col('Status'), CF = SpreadsheetApp.newConditionalFormatRule, rules = [];
  rules.push(CF().whenFormulaSatisfied('=AND(' + L('Status') + '="New",' + L('Received') + '<NOW()-2/24)').setBackground('#F8D7DA').setFontColor('#8B1E2B').setBold(true).setRanges([st]).build());
  rules.push(CF().whenFormulaSatisfied('=AND(' + L('Follow-up') + '>0,' + L('Follow-up') + '<=TODAY(),OR(' + OPEN.map(function (s) { return L('Status') + '="' + s + '"'; }).join(',') + '))').setBackground('#F8D7DA').setFontColor('#8B1E2B').setBold(true).setRanges([col('Follow-up')]).build());
  [['New', '#FFF3CD', '#7A5B00'], ['Contacted', '#DCE7F5', '#0B2545'], ['Quoted', '#E5DDF7', '#4B2E83'], ['Booked', '#D4EDDA', '#1F7A5C'], ['Completed', '#C9E6D2', '#14543F'], ['Lost', '#ECEFF3', '#5B6475'], ['Spam', '#ECEFF3', '#9AA3B2']].forEach(function (s) {
    rules.push(CF().whenTextEqualTo(s[0]).setBackground(s[1]).setFontColor(s[2]).setBold(true).setRanges([st]).build());
  });
  rules.push(CF().whenFormulaSatisfied('=OR(' + L('Status') + '="Lost",' + L('Status') + '="Spam")').setFontColor('#9AA3B2').setRanges([all]).build());
  sh.setConditionalFormatRules(rules);

  if (!sh.getFilter()) sh.getRange(1, 1, sh.getMaxRows(), width).createFilter();
  sh.getProtections(SpreadsheetApp.ProtectionType.RANGE).forEach(function (p) { if (p.getDescription() === 'vt-system') p.remove(); });
  sh.getRange(1, 1, 1, width).protect().setDescription('vt-system').setWarningOnly(true);
  sh.getRange(2, map['Received'], rows, map['Data'] - map['Received'] + 1 > 0 ? map['Data'] - map['Received'] + 1 : 1).protect().setDescription('vt-system').setWarningOnly(true);
  return { sheet: sh, map: map };
}

function letter_(n) { var s = ''; while (n > 0) { s = String.fromCharCode(65 + (n - 1) % 26) + s; n = Math.floor((n - 1) / 26); } return s; }

function setupDashboard_(ss, leads) {
  var sh = tab_(ss, TAB.dash), R = function (h) { var c = letter_(leads.map[h]); return TAB.leads + '!$' + c + '$2:$' + c; };
  sh.clear();
  var st = R('Status'), rec = R('Received'), fu = R('Follow-up'), q = R('Quote ₹'), trip = R('Trip type'), won = '(COUNTIF(' + st + ',"Booked")+COUNTIF(' + st + ',"Completed"))';
  var kpi = [
    ['New today', '=COUNTIFS(' + rec + ',">="&TODAY())', '0'],
    ['This week', '=COUNTIFS(' + rec + ',">="&(TODAY()-WEEKDAY(TODAY(),2)+1))', '0'],
    ['This month', '=COUNTIFS(' + rec + ',">="&(EOMONTH(TODAY(),-1)+1))', '0'],
    ['Not contacted yet', '=COUNTIF(' + st + ',"New")', '0'],
    ['Follow-ups due', '=' + OPEN.map(function (s) { return 'COUNTIFS(' + fu + ',">0",' + fu + ',"<="&TODAY(),' + st + ',"' + s + '")'; }).join('+'), '0'],
    ['Quotes waiting', '=COUNTIF(' + st + ',"Quoted")', '0'],
    ['Booked + completed', '=' + won, '0'],
    ['Conversion', '=IFERROR(' + won + '/(COUNTA(' + st + ')-COUNTIF(' + st + ',"Spam")),0)', '0%'],
    ['Booked value', '=SUMIFS(' + q + ',' + st + ',"Booked")+SUMIFS(' + q + ',' + st + ',"Completed")', '[$₹]#,##0']
  ];
  sh.getRange('A1').setValue('Velocity Travels – leads at a glance').setFontSize(16).setFontWeight('bold').setFontColor('#0B2545');
  kpi.forEach(function (k, i) {
    var r = 3 + Math.floor(i / 3) * 3, c = 1 + (i % 3) * 2;
    sh.getRange(r, c).setValue(k[0]).setFontColor('#5B6475').setFontWeight('bold');
    sh.getRange(r + 1, c).setFormula(k[1]).setNumberFormat(k[2]).setFontSize(20).setFontWeight('bold').setFontColor('#0B2545').setHorizontalAlignment('left');
  });
  var table = function (col, title, names, range) {
    sh.getRange(13, col, 1, 2).setValues([[title, 'Leads']]).setFontWeight('bold').setBackground('#0B2545').setFontColor('#FFFFFF');
    names.forEach(function (n, i) { sh.getRange(14 + i, col).setValue(n); sh.getRange(14 + i, col + 1).setFormula('=COUNTIF(' + range + ',"' + n + '")'); });
  };
  table(1, 'Status', STATUSES, st);
  table(3, 'Trip type', Object.keys(TRIPS).map(function (k) { return TRIPS[k]; }), trip);
  sh.getRange(13, 5, 1, 2).setValues([['Source', 'Leads']]).setFontWeight('bold').setBackground('#0B2545').setFontColor('#FFFFFF');
  var sc = letter_(leads.map['Source']);
  sh.getRange(14, 5).setFormula('=IFERROR(QUERY(' + R('Source') + ',"select ' + sc + ', count(' + sc + ') where ' + sc + " <> '' group by " + sc + ' order by count(' + sc + ") desc limit 12 label count(" + sc + ") ''\",0),\"No leads yet\")");
  [190, 80, 220, 80, 190, 80].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  sh.setHiddenGridlines(true);
}

/** Adds a clearly marked lead and sends the emails, so you can check everything works. */
function sendTestLead() {
  var to = teamEmails_()[0] || '';
  var r = handleEnquiry({
    requestId: 'test-' + Utilities.getUuid(), reference: newReference_(), trip: 'pilgrimage', name: 'TEST Lead', code: '+91', phone: '9000000000', email: to, contact: 'WhatsApp',
    onWhatsApp: true, best: ['Evening'], pickup: 'Kottayam', places: ['Sabarimala', 'Erumeli'], startDate: Utilities.formatDate(new Date(Date.now() + 14 * 864e5), TZ, 'yyyy-MM-dd'),
    adults: 6, children: 1, vehicle: 'Tempo Traveller', virtualQ: 'Yes', notes: 'This is a test. You can delete this row.', source: { source: 'test' }
  }, { test: true });
  ss_().toast(r.ok ? (to ? 'Test lead added. Check your inbox.' : 'Test lead added, but no email: fill in Team emails on the Settings tab.') : 'Problem: ' + r.error, 'Velocity Travels', 8);
  return r;
}
