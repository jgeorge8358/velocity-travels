# Fake Apps Script endpoint for testing the website form: redirects and cross-site headers like Google, no preflight support.
# Usage: /usr/bin/ruby backend/tests/stub.rb   then in the page console: VT_CONFIG.formEndpoint = "http://127.0.0.1:8769/exec"
# Modes: /mode?m=ok|down|busy|drop|dropnosave|html|slow&clear=1     What arrived: /log
require 'webrick'; require 'json'
$saved={}; $log=[]; $mode='ok'
class S < WEBrick::HTTPServlet::AbstractServlet
  def do_OPTIONS(q,r); $log << 'OPTIONS PREFLIGHT'; r.status=405; end
  def do_GET(q,r)
    if q.path=='/mode' then $mode=q.query['m'].to_s; $log.clear; $saved.clear if q.query['clear']; r['Access-Control-Allow-Origin']='*'; r.body='{}'; return end
    if q.path=='/log' then r['Access-Control-Allow-Origin']='*'; r.body=JSON.generate({log:$log,n:$saved.size,saved:$saved.values}); return end
    if q.path=='/echo' then r['Access-Control-Allow-Origin']='*'; r['Content-Type']='application/json'; r.body=q.query['d'].to_s; return end
    if q.path=='/exec' then $log << 'GET check'; redirect(r, {ok:true,saved:$saved.key?(q.query['check'].to_s)}) end
  end
  def do_POST(q,r)
    d=JSON.parse(q.body); dup=$saved.key?(d['requestId']); $log << "POST #{q['content-type']} cookie=#{!q['cookie'].nil?} dup=#{dup}"
    case $mode
    when 'down' then r.status=500
    when 'busy' then redirect(r,{ok:false,error:'busy'})
    when 'drop' then $saved[d['requestId']]=d; r.status=500
    when 'dropnosave' then r.status=500
    when 'html' then r['Access-Control-Allow-Origin']='*'; r['Content-Type']='text/html'; r.body='<html>sign in</html>'
    when 'slow' then sleep 4; $saved[d['requestId']]=d; redirect(r,{ok:true,reference:d['reference']})
    else $saved[d['requestId']]||=d; redirect(r,{ok:true,reference:d['reference']})
    end
  end
  def redirect(r,o); r.status=302; r['Access-Control-Allow-Origin']='*'; r['Location']='http://127.0.0.1:8769/echo?d='+WEBrick::HTTPUtils.escape_form(JSON.generate(o)); end
end
s=WEBrick::HTTPServer.new(Port:8769,BindAddress:'127.0.0.1',AccessLog:[],Logger:WEBrick::Log.new('/dev/null')); s.mount('/',S); s.start
