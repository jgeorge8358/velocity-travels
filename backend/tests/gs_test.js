// Offline tests for Code.gs: fakes Google services and runs in macOS JavaScriptCore (no Node needed).
// Usage: osascript -l JavaScript backend/tests/gs_test.js "$PWD/backend/Code.gs" /tmp   (also writes team.html and receipt.html there)
ObjC.import('Foundation');
function run(argv) {
  var src = ObjC.unwrap($.NSString.stringWithContentsOfFileEncodingError(argv[0], 4, null));
  var G = { mails: [], failMail: false, quota: 100, cache: {}, props: {}, triggers: [], formulas: {}, tabs: [], toasts: [] };
  function chain(extra) { return new Proxy(extra || {}, { get: function (t, k) { if (k in t) return t[k]; return function () { return chain(t); }; } }); }
  function Sheet(name) { this.name = name; this.d = []; this.f = {}; this.maxR = 1000; this.maxC = 26; this.filter = null; this.prot = []; }
  Sheet.prototype = {
    getName: function () { return this.name; }, setName: function (n) { this.name = n; return this; }, getSheetId: function () { return 7; },
    getLastRow: function () { for (var i = this.d.length; i > 0; i--) if ((this.d[i - 1] || []).some(function (v) { return v !== '' && v !== undefined; })) return i; return 0; },
    getLastColumn: function () { var m = 0; this.d.forEach(function (r) { (r || []).forEach(function (v, i) { if (v !== '' && v !== undefined) m = Math.max(m, i + 1); }); }); return m; },
    getMaxRows: function () { return this.maxR; }, getMaxColumns: function () { return this.maxC; },
    insertRowsAfter: function (a, n) { this.maxR += n; }, insertColumnAfter: function () { this.maxC++; },
    appendRow: function (r) { this.d[this.getLastRow()] = r.slice(); }, deleteRows: function (s, n) { this.d.splice(s - 1, n); },
    clear: function () { this.d = []; this.f = {}; return this; }, getFilter: function () { return this.filter; },
    getProtections: function () { return this.prot.slice(); }, setColumnWidth: function () { return this; }, setRowHeight: function () { return this; }, setFrozenRows: function () { }, setFrozenColumns: function () { }, hideColumns: function () { }, setHiddenGridlines: function () { }, setConditionalFormatRules: function (r) { this.cf = r; },
    getRange: function (r, c, nr, nc) {
      var sh = this; if (typeof r === 'string') { r = 1; c = 1; } nr = nr || 1; nc = nc || 1;
      if (!(r >= 1 && c >= 1)) throw new Error('bad range ' + r + ',' + c + ' on ' + sh.name);
      if (r + nr - 1 > sh.maxR || c + nc - 1 > sh.maxC) throw new Error('range outside grid ' + [r, c, nr, nc] + ' max ' + sh.maxR + 'x' + sh.maxC);
      var R = {
        getValues: function () { var o = []; for (var i = 0; i < nr; i++) { var a = []; for (var j = 0; j < nc; j++) { var v = (sh.d[r - 1 + i] || [])[c - 1 + j]; a.push(v === undefined ? '' : v); } o.push(a); } return o; },
        getValue: function () { return R.getValues()[0][0]; }, getRow: function () { return r; },
        setValues: function (v) { if (v.length !== nr || v[0].length !== nc) throw new Error('size mismatch ' + v.length + 'x' + v[0].length + ' vs ' + nr + 'x' + nc); for (var i = 0; i < nr; i++) for (var j = 0; j < nc; j++) { sh.d[r - 1 + i] = sh.d[r - 1 + i] || []; var x = v[i][j]; if (typeof x === 'string' && x[0] === '=') G.formulaLeak = x; if (typeof x === 'string' && x[0] === "'") x = x.slice(1); sh.d[r - 1 + i][c - 1 + j] = x; } return R; },
        setValue: function (v) { return R.setValues([[v]]); }, setFormula: function (f) { sh.f[r + ',' + c] = f; sh.d[r - 1] = sh.d[r - 1] || []; sh.d[r - 1][c - 1] = '#'; return R; },
        setNumberFormats: function (f) { if (f[0].length !== nc) throw new Error('fmt size'); sh.fmt = f[0]; return R; },
        createTextFinder: function (t) { return { matchEntireCell: function () { return this; }, findNext: function () { for (var i = 0; i < nr; i++) if (String((sh.d[r - 1 + i] || [])[c - 1]) === t) return sh.getRange(r + i, c); return null; } }; },
        createFilter: function () { sh.filter = {}; }, protect: function () { var p = { d: '', setDescription: function (x) { p.d = x; return p; }, getDescription: function () { return p.d; }, setWarningOnly: function () { return p; }, remove: function () { sh.prot.splice(sh.prot.indexOf(p), 1); } }; sh.prot.push(p); return p; }
      };
      var X = new Proxy(R, { get: function (t, k) { if (!(k in t)) return function () { return X; }; return function () { var v = t[k].apply(t, arguments); return v === R ? X : v; }; } });
      return X;
    }
  };
  var first = new Sheet('Sheet1'); G.tabs = [first];
  var ss = { getSheetByName: function (n) { return G.tabs.filter(function (t) { return t.name === n; })[0] || null; }, getSheets: function () { return G.tabs; }, insertSheet: function (n) { var s = new Sheet(n); G.tabs.push(s); return s; }, getUrl: function () { return 'https://docs.google.com/spreadsheets/d/x/edit'; }, setSpreadsheetTimeZone: function () { }, setSpreadsheetLocale: function () { }, toast: function (m) { G.toasts.push(m); } };
  var SpreadsheetApp = { getActiveSpreadsheet: function () { return ss; }, flush: function () { }, ProtectionType: { RANGE: 1 }, newDataValidation: function () { return chain(); }, newConditionalFormatRule: function () { return chain(); }, getUi: function () { return chain(); } };
  var MailApp = { sendEmail: function (m) { if (G.failMail) throw new Error('Service invoked too many times: x@y.com'); G.mails.push(m); }, getRemainingDailyQuota: function () { return G.quota; } };
  var LockService = { getScriptLock: function () { return { waitLock: function () { }, releaseLock: function () { } }; }, getUserLock: function () { return { tryLock: function () { return true; }, releaseLock: function () { } }; } };
  var CacheService = { getScriptCache: function () { return { get: function (k) { return G.cache[k] || null; }, put: function (k, v, s) { if (s > 21600) throw new Error('ttl'); G.cache[k] = v; } }; } };
  var PropertiesService = { getScriptProperties: function () { return { getProperty: function (k) { return G.props[k] || null; }, setProperty: function (k, v) { G.props[k] = v; } }; } };
  function ist(d) { return new Date(d.getTime() + 5.5 * 36e5); }
  var M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], z = function (n) { return ('0' + n).slice(-2); };
  var Utilities = { formatDate: function (d, tz, f) { var x = ist(d), y = x.getUTCFullYear(), m = x.getUTCMonth(), a = x.getUTCDate(); return f === 'yyMMdd' ? String(y).slice(2) + z(m + 1) + z(a) : f === 'yyyy-MM-dd' ? y + '-' + z(m + 1) + '-' + z(a) : f === 'yyyyMMdd' ? y + z(m + 1) + z(a) : a + ' ' + M[m] + ' ' + y; }, parseDate: function (s) { return new Date(s + 'T00:00:00+05:30'); }, getUuid: function () { return 'uuid-' + Math.floor(Math.random() * 1e9); } };
  var ContentService = { MimeType: { JSON: 1 }, createTextOutput: function (t) { return { t: t, setMimeType: function () { return this; } }; } };
  var ScriptApp = { getProjectTriggers: function () { return G.triggers.slice(); }, deleteTrigger: function (t) { G.triggers.splice(G.triggers.indexOf(t), 1); }, newTrigger: function (f) { var o = { getHandlerFunction: function () { return f; }, timeBased: function () { return o; }, everyMinutes: function () { return o; }, atHour: function () { return o; }, everyDays: function () { return o; }, inTimezone: function () { return o; }, create: function () { G.triggers.push(o); } }; return o; } };
  var api = new Function('SpreadsheetApp', 'MailApp', 'LockService', 'CacheService', 'PropertiesService', 'Utilities', 'ContentService', 'ScriptApp', src + '\nreturn {doPost,doGet,setup,retryEmails,dailyDigest,sendTestLead,reset:function(){settingsCache_=null},teamEmail_,receiptEmail_,clean_};')(SpreadsheetApp, MailApp, LockService, CacheService, PropertiesService, Utilities, ContentService, ScriptApp);
  var out = [], pass = 0, fail = 0;
  function ok(n, c, x) { if (c) pass++; else { fail++; out.push('FAIL ' + n + (x !== undefined ? ' -> ' + JSON.stringify(x) : '')); } }
  var id = 0; function post(o, raw) { G.cache = o && o._keep ? G.cache : {}; var r = api.doPost({ postData: { contents: raw || JSON.stringify(o) } }); return JSON.parse(r.t); }
  function P(x) { var o = { requestId: 'req-0000-' + (++id), reference: 'VT-261124-1234', elapsed: 9000, website: '', trip: 'tour', name: 'Anu Mathew', code: '+91', phone: '9876543210', email: '', contact: 'WhatsApp', onWhatsApp: true, best: [], source: {} }; for (var k in x) o[k] = x[k]; return o; }
  function leads() { return ss.getSheetByName('Leads'); } function H() { var m = {}; leads().d[0].forEach(function (h, i) { m[h] = i; }); return m; }
  function cell(h, r) { var s = leads(); r = r || s.getLastRow(); return s.d[r - 1][H()[h]]; }
  try {
    ok('no setup -> server_error', post(P()).error === 'server_error');
    api.setup(); api.setup();
    ok('tabs', G.tabs.map(function (t) { return t.name; }).sort().join() === 'Dashboard,Leads,Log,Settings', G.tabs.map(function (t) { return t.name; }));
    ok('two triggers after 2 setups', G.triggers.length === 2); ok('30 headers', leads().d[0].length === 30, leads().d[0].length); ok('protections not duplicated', leads().prot.length === 2, leads().prot.length);
    ok('no team email -> saved, pending', post(P()).ok && /^Pending 1$/.test(cell('Team email')), cell('Team email'));
    var set = ss.getSheetByName('Settings'); set.d[1][1] = 'a@x.com, b@x.com'; api.reset();
    ['tour', 'pilgrimage', 'transfer', 'event', 'vehicle', 'corporate', 'other'].forEach(function (t) { var n = G.mails.length, r = post(P({ trip: t, pickup: 'Kottayam', startDate: '2026-12-10', endDate: '2026-12-12', adults: 2, children: 1 })); ok('trip ' + t, r.ok && r.reference === 'VT-261124-1234' && cell('Status') === 'New' && cell('Team email') === 'Sent' && cell('Receipt') === '–' && G.mails.length === n + 1, r); });
    ok('people', cell('People') === '2 adults, 1 child', cell('People')); ok('phone', cell('Phone') === '(+91) 98765 43210', cell('Phone')); ok('date is Date', cell('Start') instanceof Date);
    var row = leads().getLastRow(); ok('wa formula', /^=HYPERLINK\("https:\/\/wa\.me\/919876543210\?text=[^"]+","Chat"\)$/.test(leads().f[row + ',' + (H()['WhatsApp'] + 1)]), leads().f[row + ',' + (H()['WhatsApp'] + 1)]);
    ok('phone col text fmt', leads().fmt[H()['Phone']] === '@');
    var p = P({ email: 'cust@example.com', contact: 'Email', places: ['Munnar', 'HACK', 'Thekkady'], notes: 'secret notes', pickup: 'http://evil.example', adults: 2 }), n = G.mails.length; post(p);
    ok('team+receipt', G.mails.length === n + 2 && cell('Receipt') === 'Sent'); var team = G.mails[n], rec = G.mails[n + 1];
    ok('replyTo customer', team.replyTo === 'cust@example.com'); ok('receipt no replyTo placeholder', !rec.replyTo); ok('receipt hides free text', (rec.htmlBody + rec.body).indexOf('evil') < 0 && (rec.htmlBody + rec.body).indexOf('secret') < 0); ok('team has notes', team.htmlBody.indexOf('secret notes') > 0); ok('places whitelisted', cell('Destination') === 'Munnar, Thekkady', cell('Destination')); ok('no placeholder phone', rec.htmlBody.indexOf('00000') < 0 && rec.htmlBody.indexOf('yourdomain') < 0);
    var d1 = post(p); ok('duplicate', d1.ok && d1.duplicate && G.mails.length === n + 2, d1); ok('check saved', JSON.parse(api.doGet({ parameter: { check: p.requestId } }).t).saved === true); ok('check unknown', JSON.parse(api.doGet({ parameter: { check: 'nope-12345' } }).t).saved === false); ok('check bad id', JSON.parse(api.doGet({ parameter: { check: '' } }).t).saved === false); ok('health', JSON.parse(api.doGet({ parameter: {} }).t).service === 'velocity-enquiries');
    G.formulaLeak = null; post(P({ name: '=IMPORTXML("http://x")', pickup: '+1+1', drop: '@SUM(A1)', notes: '-2+3\n=A1', company: "'=x", otherPlaces: '\t=1' })); ok('no formula leak', !G.formulaLeak, G.formulaLeak); ok('name stored', cell('Name') === '=IMPORTXML("http://x")', cell('Name'));
    n = G.mails.length; post(P({ name: '<img src=x onerror=1> Bob', email: 'z@example.com', notes: '<script>x</script>' })); ok('html escaped', G.mails[n].htmlBody.indexOf('<img') < 0 && G.mails[n].htmlBody.indexOf('<script') < 0); ok('receipt drops odd name', G.mails[n + 1].htmlBody.indexOf('Thank you!') > 0);
    n = G.mails.length; post(P({ name: 'A\r\nBcc: x@y.com B' })); ok('subject one line', !/[\r\n]/.test(G.mails[n].subject), G.mails[n].subject);
    var before = leads().getLastRow();
    [['requestId', { requestId: 'x' }], ['trip', { trip: 'hack' }], ['trip proto', { trip: '__proto__' }], ['trip ctor', { trip: 'constructor' }], ['name', { name: 'A' }], ['phone', { phone: '12345' }], ['phone start', { phone: '1234567890' }], ['code', { code: '+999' }], ['email', { email: 'bad' }], ['email list', { email: 'a@b.co,c@d.co' }], ['email needed', { contact: 'Email' }]].forEach(function (c) { var r = post(P(c[1])); ok('reject ' + c[0], r.ok === false && r.error === 'invalid', r); });
    ok('fast', post(P({ elapsed: 500 })).error === 'retry'); ok('elapsed missing', post(P({ elapsed: 'x' })).error === 'retry'); ok('honeypot', post(P({ website: 'spam' })).ok === true); ok('bad json', post(null, '{').error === 'bad_request'); ok('array', post(null, '[]').error === 'bad_request'); ok('null', post(null, 'null').error === 'bad_request'); ok('huge', post(null, '{"a":"' + new Array(21000).join('x') + '"}').error === 'bad_request'); ok('empty', JSON.parse(api.doPost({}).t).error === 'bad_request');
    ok('nothing saved by rejects', leads().getLastRow() === before);
    post(P({ name: "\u0d05\u0d28\u0d4d\u200d\u0d35\u0d7c", email: "ml@example.com" })); ok("malayalam name kept", cell("Name").indexOf("\u200d") > 0 && G.mails[G.mails.length - 1].htmlBody.indexOf("Thank you, \u0d05") > 0, cell("Name"));
    ok('+91 variants', post(P({ phone: '+91 98765 43210' })).ok && cell('Phone') === '(+91) 98765 43210' && post(P({ phone: '09876543210' })).ok); ok('uae', post(P({ code: '+971', phone: '501234567' })).ok && cell('Phone') === '(+971) 501234567');
    post(P({ startDate: '2026-12-12', endDate: '2026-12-01' })); ok('end<start dropped', cell('End') === ''); post(P({ startDate: '2026-02-31' })); ok('bad date', cell('Start') === ''); post(P({ datesOpen: true, startDate: '2026-12-12' })); ok('dates open', cell('Start') === '' && /Not fixed/.test(cell('Details')));
    G.cache = {}; var rs = []; for (var i = 0; i < 7; i++) rs.push(post(P({ _keep: 1, phone: '9000000001' }))); ok('phone limit', rs.filter(function (r) { return r.ok; }).length === 5 && rs[6].error === 'busy', rs);
    G.cache = {}; rs = []; for (i = 0; i < 25; i++) rs.push(post(P({ _keep: 1, phone: '90000010' + (10 + i) }))); ok('minute limit', rs.filter(function (r) { return r.ok; }).length === 20);
    G.cache = {}; rs = []; for (i = 0; i < 4; i++) { post(P({ _keep: 1, phone: '90000020' + (10 + i), email: 'same@example.com' })); rs.push(cell('Receipt')); } ok('receipt per address', rs.join() === 'Sent,Sent,Limited,Limited', rs);
    G.quota = 25; n = G.mails.length; post(P({ email: 'q@example.com' })); ok('quota reserve', cell('Receipt') === 'Quota' && G.mails.length === n + 1); G.quota = 100;
    G.failMail = true; var r = post(P({ email: 'f@example.com' })); ok('email failure still ok', r.ok && cell('Team email') === 'Pending 1' && cell('Receipt') === 'Failed'); var fr = leads().getLastRow();
    ok('retry waits 2 min', api.retryEmails() === 0); leads().d[fr - 1][H()['Received']] = new Date(Date.now() - 3e5); leads().d[1][H()['Team email']] = 'Sent';
    api.retryEmails(); ok('retry counts', cell('Team email', fr) === 'Pending 2', cell('Team email', fr)); api.retryEmails(); api.retryEmails(); api.retryEmails(); ok('gives up', cell('Team email', fr) === 'Failed', cell('Team email', fr)); leads().d[fr - 1][H()['Team email']] = 'Pending 2'; G.failMail = false; ok('retry sends', api.retryEmails() === 1 && cell('Team email', fr) === 'Sent');
    var logs = ss.getSheetByName('Log').d.map(function (x) { return x[2]; }).join('|'); ok('log no email', !/x@y\.com/.test(logs)); 
    n = G.mails.length; ok('digest', api.dailyDigest() === true && G.mails.length === n + 1 && /attention/.test(G.mails[n].subject), G.mails[n] && G.mails[n].subject);
    leads().d.slice(1).forEach(function (x) { x[0] = 'Booked'; }); ok('digest quiet', api.dailyDigest() === false);
    set.d.forEach(function (x) { if (x[0] === 'Customer receipts') x[1] = 'No'; }); api.reset(); post(P({ email: 'o@example.com' })); ok('receipts off', cell('Receipt') === 'Off');
    ok('test lead', api.sendTestLead().ok && cell('Name') === 'TEST Lead'); 
    /* team inserts a column at the left; mapping still works */
    leads().d.forEach(function (x) { x.unshift('mine'); }); leads().d[0][0] = 'My column'; leads().maxC++; var rr = post(P({ name: 'Moved Cols' })); ok('moved columns', rr.ok && cell('Name') === 'Moved Cols' && cell('Team email') === 'Sent', rr);
    leads().maxR = leads().getLastRow(); ok('grid grows', post(P()).ok);
    var html = api.receiptEmail_(api.clean_(P({ trip: 'pilgrimage', email: 'c@example.com', places: ['Sabarimala', 'Erumeli'], startDate: '2026-12-20', adults: 6, children: 1, vehicle: 'Tempo Traveller' })).lead).html, th = api.teamEmail_(api.clean_(P({ trip: 'pilgrimage', email: 'c@example.com', pickup: 'Kottayam', places: ['Sabarimala', 'Erumeli'], startDate: '2026-12-20', adults: 6, children: 1, vehicle: 'Tempo Traveller', virtualQ: 'Yes', notes: 'Two elderly travellers.\nNeed a stop at Erumeli.', source: { source: 'instagram', medium: 'social', campaign: 'mandala' } })).lead, 2);
    $(html).writeToFileAtomicallyEncodingError(argv[1] + '/receipt.html', true, 4, null); $(th.html).writeToFileAtomicallyEncodingError(argv[1] + '/team.html', true, 4, null); out.push('subject: ' + th.subject);
  } catch (e) { fail++; out.push('CRASH ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 4).join(' < ')); }
  return pass + ' passed, ' + fail + ' failed\n' + out.join('\n');
}
