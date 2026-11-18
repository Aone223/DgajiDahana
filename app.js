"use strict";
/* ============================================================
   DGAJI — DAHANA  (app-shell + PWA)
   Penyimpanan: localStorage per perangkat
   Periode gaji: tgl 21 bln lalu – 20 bln ini (tutup buku tgl 20)
   ============================================================ */

var K_REC='dgaji_rec_v1', K_SET='dgaji_set_v1', K_TH='dgaji_theme_v1';
var CUT=17*60;
var HARI=['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
var BULAN=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
var BLN=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

function ls(fn,d){try{return fn()}catch(e){return d}}
function getRecs(){return ls(function(){return JSON.parse(localStorage.getItem(K_REC))||[]},[])}
function setRecs(r){ls(function(){localStorage.setItem(K_REC,JSON.stringify(r))})}
function getSet(){return ls(function(){return JSON.parse(localStorage.getItem(K_SET))},null)}
function saveSet(s){ls(function(){localStorage.setItem(K_SET,JSON.stringify(s))})}

function fmt(m){var h=Math.floor(m/60),mm=m%60;return (h<10?'0':'')+h+':'+(mm<10?'0':'')+mm;}
function jamNum(n){return (Math.round(n*100)/100).toString().replace('.',',');}
function jamTxt(n){return jamNum(n)+' jam';}
function rupiah(n){return 'Rp '+Math.round(n||0).toLocaleString('id-ID');}
function parseRp(s){var d=String(s).replace(/\D/g,'');return d?parseInt(d,10):0;}
function $(id){return document.getElementById(id);}

function maskTime(str){var d=String(str).replace(/\D/g,'');if(!d)return '';
  var hl=(d.charAt(0)>='3')?1:2;if(d.length<=hl)return d;return d.slice(0,hl)+':'+d.slice(hl,hl+2);}
function parseJam(raw){var d=String(raw).replace(/\D/g,'');if(!d)return null;
  var hl=(d.charAt(0)>='3')?1:2;var h=parseInt(d.slice(0,hl),10);var m=parseInt(d.slice(hl,hl+2)||'0',10);
  if(isNaN(h)||isNaN(m)||m>59)return null;var nolDepan=d.charAt(0)==='0';
  if(!nolDepan&&h>=1&&h<=7)h+=12;   /* 5 -> 17:00, tapi 05:00 tetap pagi */
  if(h<8||h>23)return null;return h*60+m;}  /* minimal 08:00 */

function dayType(s){if(!s)return 'biasa';var g=new Date(s+'T00:00:00').getDay();
  if(g===0)return 'minggu';if(g===6)return 'sabtu';return 'biasa';}
function periodKey(dateStr){var d=new Date(dateStr+'T00:00:00');var y=d.getFullYear(),m=d.getMonth();
  if(d.getDate()>=21){m++;if(m>11){m=0;y++;}}return y+'-'+String(m+1).padStart(2,'0');}
function periodLabel(k){var p=k.split('-');return BULAN[parseInt(p[1],10)-1]+' '+p[0];}
function periodNote(k){var p=k.split('-'),y=+p[0],m=+p[1]-1;var sm=m-1,sy=y;if(sm<0){sm=11;sy--;}
  return '21 '+BLN[sm]+' '+(sy!==y?sy+' ':'')+'– 20 '+BLN[m]+' '+y;}

/* ========== INTI JAM KERJA ========== */
/* pembulatan menit jam pulang: 0–16 -> :00 (ke bawah), 17–46 -> :30, 47–59 -> jam berikutnya */
function bulatkan(m){var h=Math.floor(m/60),mm=m%60;if(mm<17)return h*60;if(mm<47)return h*60+30;return (h+1)*60;}
function hitung(o){
  var bulat=o.jamPulang!=null?bulatkan(o.jamPulang):null;
  var lewat=bulat!=null&&bulat>CUT;var atas50=lewat?true:o.atas50;
  var base=0,lembur=0,kalc='',rM=lewat?bulat-CUT:0;
  if(o.type==='minggu'){
    if(!lewat){base=atas50?25:21;kalc='Minggu · DTH '+(atas50?'di atas':'di bawah')+' 50 Ton';}
    else{base=25;lembur=rM/15;kalc='Minggu · lembur ×4 / 30 mnt';}
  }else if(o.type==='sabtu'){
    if(!lewat){base=atas50?9.5:7.5;kalc='Sabtu · DTH '+(atas50?'di atas':'di bawah')+' 50 Ton';}
    else{base=9.5;lembur=rM/30;kalc='Sabtu · lembur ×2 / 30 mnt';}
  }else{
    if(!lewat){base=atas50?5.5:3.5;kalc='Hari biasa · DTH '+(atas50?'di atas':'di bawah')+' 50 Ton';}
    else{base=5.5;lembur=rM/30;kalc='Hari biasa · lembur ×2 / 30 mnt';}
  }
  var amb=o.pengambilan?1:0;
  return {base:base,lembur:lembur,ambil:amb,total:base+lembur+amb,bulat:bulat,lewat:lewat,atas50:atas50,kalc:kalc,forced:(lewat&&!o.atas50)};
}
function isOff(){return $('off').checked;}
function curInput(){return {type:dayType($('tanggal').value),
  atas50:$('segDth').querySelector('.on').dataset.v==='atas',
  jamPulang:parseJam($('pulang').value),pengambilan:$('pengambilan').checked};}

/* ========== RENDER INPUT ========== */
function renderHari(){var t=$('tanggal').value,b=$('hariBadge');b.className='hari-badge';
  if(!t){$('hariNama').textContent='—';return;}
  var g=new Date(t+'T00:00:00').getDay(),ty=dayType(t);
  $('hariNama').textContent=HARI[g];
  if(ty!=='biasa')b.classList.add(ty);}
function renderEcho(){var raw=$('pulang').value,el=$('jamEcho'),m=parseJam(raw);
  if(!raw){el.textContent='';el.className='jam-echo';return;}
  if(m==null){el.className='jam-echo bad';el.textContent='Jam pulang tidak valid — minimal 08:00';return;}
  el.className='jam-echo';
  var bl=bulatkan(m);
  if(bl>CUT)el.innerHTML='Pukul <b>'+fmt(m)+'</b> · <span class="ov">lembur, dibulatkan '+fmt(bl)+'</span>';
  else if(m>CUT)el.innerHTML='Pukul <b>'+fmt(m)+'</b> · dibulatkan 17:00, tidak lembur';
  else el.innerHTML='Pukul <b>'+fmt(m)+'</b>';}
var lastTotal=null;
function renderResult(){
  var res=$('result'),big=$('bigTotal'),bd=$('breakdown'),cap=res.querySelector('.cap');
  if(isOff()){res.classList.add('off');$('offWrap').classList.add('disabled');
    cap.textContent='Status Hari Ini';big.innerHTML='OFF <small>/ libur</small>';
    bd.innerHTML='<div class="brow"><span>Hari libur / tidak kerja</span><span>0 jam</span></div>';lastTotal=null;return;}
  res.classList.remove('off');$('offWrap').classList.remove('disabled');cap.textContent='Jam Kerja Hari Ini';
  var i=curInput();if(i.jamPulang==null){big.innerHTML='—';bd.innerHTML='';lastTotal=null;return;}
  var r=hitung(i);big.innerHTML=jamNum(r.total)+' <small>jam</small>';
  if(lastTotal!==null&&lastTotal!==r.total){big.classList.remove('bump');void big.offsetWidth;big.classList.add('bump');}
  lastTotal=r.total;
  var h='<div class="brow"><span>'+r.kalc+'</span><span>'+jamTxt(r.base)+'</span></div>';
  if(r.lembur>0)h+='<div class="brow"><span>Lembur (pulang → '+fmt(r.bulat)+')</span><span>+'+jamTxt(r.lembur)+'</span></div>';
  if(r.ambil>0)h+='<div class="brow"><span>Ikut Pengambilan</span><span>+1 jam</span></div>';
  h+='<div class="brow tot"><span>Total Jam Kerja</span><span>'+jamTxt(r.total)+'</span></div>';
  if(r.forced)h+='<div class="note">⚠️ <span>Pulang lewat jam 5 otomatis dihitung <b>di atas 50 Ton</b>.</span></div>';
  bd.innerHTML=h;}

/* ========== PERIODE (gaji 21–20) ========== */
var curPeriod=null, lastGaji=0;
function reduced(){try{return matchMedia('(prefers-reduced-motion: reduce)').matches;}catch(e){return false;}}
function countUp(el,to,render){
  if(!el)return;if(reduced()){el.textContent=render(to);return;}
  var start=null,dur=700;
  function step(ts){if(start===null)start=ts;var p=Math.min((ts-start)/dur,1);var e=1-Math.pow(1-p,3);
    el.textContent=render(to*e);if(p<1)requestAnimationFrame(step);else el.textContent=render(to);}
  requestAnimationFrame(step);}
function todayStr(){var t=new Date();t.setMinutes(t.getMinutes()-t.getTimezoneOffset());return t.toISOString().slice(0,10);}
function shiftPeriod(k,n){var p=k.split('-'),y=+p[0],m=+p[1]-1+n;while(m<0){m+=12;y--;}while(m>11){m-=12;y++;}
  return y+'-'+String(m+1).padStart(2,'0');}
function periodRecs(k){return getRecs().filter(function(r){return periodKey(r.tanggal)===k;});}
function calcPeriod(k){
  var recs=periodRecs(k),totJam=0,hari=0;recs.forEach(function(r){totJam+=r.total||0;if(!r.off)hari++;});
  var s=getSet()||{},lembur=totJam*(s.tLembur||0);
  var hadir=hari*(s.tHadir||0), makan=hari*(s.uangMakan||0);   // dikali jumlah hari kerja
  return {recs:recs,totJam:totJam,hari:hari,s:s,lembur:lembur,hadir:hadir,makan:makan,
    total:(s.gajiPokok||0)+(s.tBerkala||0)+hadir+lembur};}
function renderGaji(){
  $('perLabel').textContent=periodLabel(curPeriod);$('periodNote').textContent=periodNote(curPeriod);
  var c=calcPeriod(curPeriod),s=c.s;lastGaji=c.total;
  $('sumJam').textContent=jamNum(c.totJam);$('sumHari').textContent=c.hari;
  $('gajiBig').textContent=rupiah(c.total);
  $('gajiBreak').innerHTML=
    '<div class="money-row"><span class="k">Gaji Pokok</span><span class="v">'+rupiah(s.gajiPokok)+'</span></div>'+
    '<div class="money-row"><span class="k">T. Berkala</span><span class="v">'+rupiah(s.tBerkala)+'</span></div>'+
    '<div class="money-row"><span class="k">T. Hadir<small>'+c.hari+' hari × '+rupiah(s.tHadir)+'</small></span><span class="v">'+rupiah(c.hadir)+'</span></div>'+
    '<div class="money-row"><span class="k">Uang Lembur<small>'+jamNum(c.totJam)+' jam × '+rupiah(s.tLembur)+'</small></span><span class="v">'+rupiah(c.lembur)+'</span></div>'+
    '<div class="money-row tot"><span class="k">Total Gaji</span><span class="v">'+rupiah(c.total)+'</span></div>';
  $('makanAmt').textContent=rupiah(c.makan);
  $('makanSub').textContent=c.hari+' hari × '+rupiah(s.uangMakan);}

/* ========== DATA PER TANGGAL ========== */
function recByDate(d){var r=getRecs().filter(function(x){return x.tanggal===d;});return r.length?r[r.length-1]:null;}
function dedupe(){ // satu tanggal satu data (simpan yang terakhir diinput)
  var recs=getRecs(),seen={},out=[];
  for(var i=recs.length-1;i>=0;i--){if(!seen[recs[i].tanggal]){seen[recs[i].tanggal]=1;out.unshift(recs[i]);}}
  if(out.length!==recs.length)setRecs(out);}
function recalcAll(){ // terapkan aturan pembulatan terbaru ke semua catatan yang sudah ada
  var recs=getRecs(),ubah=false;
  recs.forEach(function(r){if(r.off||r.jamPulang==null)return;
    var h=hitung({type:r.type,atas50:r.atas50,jamPulang:r.jamPulang,pengambilan:r.pengambilan});
    if(h.total!==r.total){r.total=h.total;ubah=true;}});
  if(ubah)setRecs(recs);}
function capType(t){return t==='biasa'?'Hari Biasa':t==='sabtu'?'Sabtu':'Minggu';}
function tglPanjang(d){return new Date(d+'T00:00:00').toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'});}
function recBreakdown(r){
  if(r.off)return '<div class="drow"><span>Status</span><b>OFF / Libur</b></div><div class="drow tot"><span>Total hari ini</span><b>0 jam</b></div>';
  var h=hitung({type:r.type,atas50:r.atas50,jamPulang:r.jamPulang,pengambilan:r.pengambilan});
  var x='<div class="drow"><span>Jenis hari</span><b>'+capType(r.type)+'</b></div>'+
    '<div class="drow"><span>Tonase (DTH)</span><b>'+(r.atas50?'Di atas 50 Ton':'Di bawah 50 Ton')+'</b></div>'+
    '<div class="drow"><span>Jam pulang</span><b>'+fmt(r.jamPulang)+(h.lewat?' → '+fmt(h.bulat):'')+'</b></div>'+
    '<div class="drow"><span>Ikut Pengambilan</span><b>'+(r.pengambilan?'Ya':'Tidak')+'</b></div>'+
    '<div class="dsep"></div>'+
    '<div class="drow"><span>Jam normal</span><b>'+jamTxt(h.base)+'</b></div>';
  if(h.lembur>0)x+='<div class="drow"><span>Lembur</span><b>+'+jamTxt(h.lembur)+'</b></div>';
  if(h.ambil>0)x+='<div class="drow"><span>Pengambilan</span><b>+1 jam</b></div>';
  var s=getSet()||{};
  x+='<div class="drow tot"><span>Total jam kerja</span><b>'+jamTxt(r.total)+'</b></div>'+
     '<div class="drow muted"><span>Nilai lembur hari ini</span><b>'+rupiah(r.total*(s.tLembur||0))+'</b></div>';
  return x;}

/* ========== HITUNG: 1 tanggal = 1 input ========== */
var editingId=null;
function setForm(r){
  $('off').checked=!!r.off;
  var on=!!r.atas50,seg=$('segDth');
  seg.querySelectorAll('button').forEach(function(b){b.classList.toggle('on',(b.dataset.v==='atas')===on)});
  seg.classList.toggle('pos1',on);
  $('pulang').value=r.jamPulang!=null?fmt(r.jamPulang):'17:00';$('pengambilan').checked=!!r.pengambilan;}
function resetForm(){setForm({off:false,atas50:false,jamPulang:CUT,pengambilan:false});}
function renderHitungState(){
  var d=$('tanggal').value,r=d?recByDate(d):null;
  var done=!!r&&(!editingId||editingId!==r.id);
  if(editingId&&r&&r.id!==editingId)done=true; // pindah ke tanggal lain yang sudah terisi
  $('tab-hitung').classList.toggle('is-done',done);$('formArea').hidden=done;$('result').hidden=done;$('saveRow').hidden=done;$('doneCard').hidden=!done;
  $('hitungTitle').textContent=editingId&&!done?'Ubah Data':'Input Harian';
  $('saveBtn').textContent=editingId?'💾 Simpan Perubahan':'＋ Simpan ke Catatan';
  $('cancelEdit').hidden=!editingId;
  if(done){
    $('doneSum').innerHTML='<div class="done-big">'+(r.off?'OFF':jamNum(r.total)+'<small> jam</small>')+'</div>'+
      '<div class="done-chips">'+(r.off?'<span class="chip off">Libur</span>':
        '<span class="chip">'+capType(r.type)+'</span><span class="chip">DTH '+(r.atas50?'> 50':'≤ 50')+'</span><span class="chip">Pulang '+fmt(r.jamPulang)+'</span>'+
        (r.pengambilan?'<span class="chip amb">+ Pengambilan</span>':''))+'</div>';
  }else renderResult();}
function startEdit(r){
  editingId=r.id;$('tanggal').value=r.tanggal;setForm(r);
  renderHari();renderEcho();renderHitungState();showTab('hitung');toast('Ubah data lalu simpan');}
function stopEdit(){editingId=null;resetForm();renderHari();renderEcho();renderHitungState();}

/* ========== RIWAYAT: KALENDER ========== */
var calY,calM,selDate,delArm=null;
function pad(n){return String(n).padStart(2,'0');}
function ds(y,m,d){return y+'-'+pad(m+1)+'-'+pad(d);}
function renderCal(){
  $('calLabel').textContent=BULAN[calM]+' '+calY;
  var first=new Date(calY,calM,1),days=new Date(calY,calM+1,0).getDate(),off=(first.getDay()+6)%7;
  var map={};getRecs().forEach(function(r){map[r.tanggal]=r;});
  var today=todayStr(),html='',tot=0,kerja=0;
  for(var i=0;i<off;i++)html+='<span class="cd empty"></span>';
  for(var d=1;d<=days;d++){
    var k=ds(calY,calM,d),r=map[k],g=new Date(calY,calM,d).getDay();
    var cls='cd'+(k===today?' today':'')+(k===selDate?' sel':'')+(g===0?' mg':'')+(r?(r.off?' has off':' has'):'');
    if(r&&!r.off){tot+=r.total;kerja++;}
    html+='<button class="'+cls+'" data-d="'+k+'"><span class="n">'+d+'</span>'+
      (r?'<span class="mk">'+(r.off?'OFF':jamNum(r.total))+'</span>':'')+'</button>';}
  var g=$('calGrid');g.innerHTML=html;g.classList.remove('slide');void g.offsetWidth;g.classList.add('slide');
  $('calSum').textContent=kerja+' hari kerja · '+jamNum(tot)+' jam';
  var pk=ds(calY,calM,15).slice(0,7);
  $('exportNote').innerHTML='Periode gaji <b>'+periodLabel(pk)+'</b> · '+periodNote(pk);
  renderDay();}
function renderDay(){
  var c=$('dayCard'),r=recByDate(selDate);delArm=null;
  var head='<div class="day-head"><div><div class="day-date">'+tglPanjang(selDate)+'</div>'+
    '<div class="day-sub">'+(r?(r.off?'Libur':'Sudah diinput'):'Belum ada data')+'</div></div>'+
    (r?'<div class="day-total'+(r.off?' off':'')+'">'+(r.off?'OFF':jamNum(r.total)+'<small> jam</small>')+'</div>':'')+'</div>';
  if(!r){c.innerHTML=head+'<div class="day-empty">Tidak ada catatan di tanggal ini.</div>'+
    '<button class="btn btn-red" id="dayAdd">＋ Input tanggal ini</button>';}
  else c.innerHTML=head+'<div class="day-body">'+recBreakdown(r)+'</div>'+
    '<div class="rec-act"><button id="dayEdit">✎ Edit</button><button class="del" id="dayDel">🗑 Hapus</button></div>';
  c.classList.remove('pop-in');void c.offsetWidth;c.classList.add('pop-in');}
function moveCal(n){calM+=n;if(calM<0){calM=11;calY--;}if(calM>11){calM=0;calY++;}
  var today=todayStr();
  selDate=(today.slice(0,7)===ds(calY,calM,1).slice(0,7))?today:ds(calY,calM,1);renderCal();}

function refreshAll(){renderGaji();renderCal();renderHitungState();}

/* ========== EXPORT ========== */
function safeName(s){return (s||'karyawan').replace(/[^\w\-]+/g,'_').replace(/^_+|_+$/g,'')||'karyawan';}
function exportKey(){return ds(calY,calM,15).slice(0,7);}
function downloadExcel(){
  var k=exportKey();
  if(typeof ExcelJS==='undefined'){toast('Komponen Excel belum siap, coba lagi');return;}
  var c=calcPeriod(k),recs=c.recs.slice().sort(function(a,b){return a.tanggal.localeCompare(b.tanggal)});
  if(!recs.length){toast('Tidak ada data di periode ini');return;}
  var s=c.s,nama=s.nama||'-',offCount=recs.filter(function(r){return r.off;}).length;
  var RED='FFC70C22',DARK='FF1E1E24',ZEBRA='FFF5F5F7',LINE='FFD5D5DB',SOFT='FFFCE9EB',GREY='FF6A6A75',WHITE='FFFFFFFF';
  var RP='"Rp" #,##0', JAM='#,##0.0';
  function fill(c){return {type:'pattern',pattern:'solid',fgColor:{argb:c}};}
  var thin={style:'thin',color:{argb:LINE}},box={top:thin,left:thin,bottom:thin,right:thin};

  var wb=new ExcelJS.Workbook();wb.creator='DGaji';wb.created=new Date();
  var ws=wb.addWorksheet(('Rekap '+periodLabel(k)).slice(0,31),{
    views:[{showGridLines:false}],
    pageSetup:{paperSize:9,orientation:'portrait',fitToPage:true,fitToWidth:1,fitToHeight:0,horizontalCentered:true,
      margins:{left:0.4,right:0.4,top:0.5,bottom:0.5,header:0.2,footer:0.2}}});
  ws.columns=[{width:5},{width:13},{width:10},{width:13},{width:11},{width:12},{width:13},{width:12}];

  // ---- judul ----
  ws.mergeCells('A1:H1');var t=ws.getCell('A1');
  t.value='REKAP JAM KERJA & GAJI';t.font={name:'Calibri',bold:true,size:16,color:{argb:WHITE}};
  t.fill=fill(RED);t.alignment={vertical:'middle',horizontal:'center'};ws.getRow(1).height=34;
  ws.mergeCells('A2:H2');var st=ws.getCell('A2');
  st.value='DGaji · Dahana';st.font={italic:true,size:10,color:{argb:GREY}};st.alignment={horizontal:'center'};

  // ---- info karyawan ----
  var info=[['Nama',nama],['Periode Gaji',periodLabel(k)],['Rentang Tanggal',periodNote(k)+'  (tutup buku tgl 20)'],
    ['Hari Kerja',c.hari+' hari'+(offCount?'  ·  OFF/Libur '+offCount+' hari':'')],
    ['Dibuat',new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'})]];
  var r=4;
  info.forEach(function(it){
    ws.mergeCells('A'+r+':B'+r);ws.mergeCells('C'+r+':H'+r);
    var l=ws.getCell('A'+r),v=ws.getCell('C'+r);
    l.value=it[0];l.font={bold:true,size:10,color:{argb:GREY}};
    v.value=it[1];v.font={bold:it[0]==='Nama',size:11};
    ['A','B','C','D','E','F','G','H'].forEach(function(col){ws.getCell(col+r).border={bottom:thin};});
    ws.getRow(r).height=18;r++;});

  // ---- tabel harian ----
  r++;var head=r;
  var cols=['No','Tanggal','Hari','Status','DTH','Jam Pulang','Pengambilan','Jam Kerja'];
  cols.forEach(function(h,i){var cell=ws.getRow(r).getCell(i+1);cell.value=h;
    cell.font={bold:true,size:10,color:{argb:WHITE}};cell.fill=fill(DARK);cell.border=box;
    cell.alignment={vertical:'middle',horizontal:'center',wrapText:true};});
  ws.getRow(r).height=22;r++;
  var first=r;
  recs.forEach(function(rec,i){
    var p=rec.tanggal.split('-'),row=ws.getRow(r);
    var hr=HARI[new Date(rec.tanggal+'T00:00:00').getDay()];
    var vals=[i+1,new Date(Date.UTC(+p[0],+p[1]-1,+p[2])),hr,
      rec.off?'OFF / Libur':'Kerja',
      rec.off?'-':(rec.atas50?'> 50 Ton':'≤ 50 Ton'),
      rec.off?'-':fmt(rec.jamPulang),
      rec.off?'-':(rec.pengambilan?'Ya':'Tidak'),
      rec.total||0];
    vals.forEach(function(v,j){var cell=row.getCell(j+1);cell.value=v;cell.border=box;
      cell.font={size:10,color:{argb:rec.off?GREY:'FF141418'},italic:!!rec.off};
      cell.alignment={vertical:'middle',horizontal:(j===2||j===3)?'left':'center'};
      if(i%2===1)cell.fill=fill(ZEBRA);});
    row.getCell(2).numFmt='dd/mm/yyyy';row.getCell(8).numFmt=JAM;
    if(hr==='Minggu')row.getCell(3).font={size:10,bold:true,color:{argb:RED}};
    row.height=18;r++;});
  var last=r-1;
  ws.mergeCells('A'+r+':G'+r);
  var tl=ws.getCell('A'+r);tl.value='TOTAL JAM KERJA';tl.alignment={horizontal:'right',vertical:'middle'};
  tl.font={bold:true,size:11};
  var tv=ws.getCell('H'+r);tv.value={formula:'SUM(H'+first+':H'+last+')',result:Math.round(c.totJam*100)/100};
  tv.numFmt=JAM;tv.font={bold:true,size:11,color:{argb:RED}};tv.alignment={horizontal:'center',vertical:'middle'};
  ['A','B','C','D','E','F','G','H'].forEach(function(col){var x=ws.getCell(col+r);x.fill=fill(SOFT);x.border=box;});
  ws.getRow(r).height=22;var totRow=r;r+=2;

  // ---- rincian gaji ----
  ws.mergeCells('A'+r+':H'+r);var rg=ws.getCell('A'+r);rg.value='RINCIAN GAJI';
  rg.font={bold:true,size:11,color:{argb:WHITE}};rg.fill=fill(DARK);rg.alignment={horizontal:'left',vertical:'middle',indent:1};
  ws.getRow(r).height=22;r++;
  function gaji(label,ket,val,style){
    ws.mergeCells('A'+r+':C'+r);ws.mergeCells('D'+r+':F'+r);ws.mergeCells('G'+r+':H'+r);
    var a=ws.getCell('A'+r),b=ws.getCell('D'+r),v=ws.getCell('G'+r);
    a.value=label;b.value=ket||'';v.value=val;v.numFmt=RP;
    a.alignment={vertical:'middle',indent:1};b.alignment={vertical:'middle'};v.alignment={horizontal:'right',vertical:'middle'};
    a.font={size:10,bold:!!style};b.font={size:9,color:{argb:GREY}};v.font={size:10,bold:!!style};
    ['A','B','C','D','E','F','G','H'].forEach(function(col){var x=ws.getCell(col+r);x.border=box;
      if(style==='total')x.fill=fill(RED);if(style==='makan')x.fill=fill(ZEBRA);});
    if(style==='total'){a.font={size:12,bold:true,color:{argb:WHITE}};v.font={size:12,bold:true,color:{argb:WHITE}};}
    ws.getRow(r).height=style==='total'?24:19;r++;}
  var g0=r;
  gaji('Gaji Pokok','Tetap',s.gajiPokok||0);
  gaji('T. Berkala','Tetap',s.tBerkala||0);
  gaji('T. Hadir',c.hari+' hari × '+rupiah(s.tHadir),Math.round(c.hadir));
  var lr=r;gaji('Uang Lembur',jamNum(c.totJam)+' jam × '+rupiah(s.tLembur),Math.round(c.lembur));
  ws.getCell('G'+lr).value={formula:'ROUND(H'+totRow+'*'+(s.tLembur||0)+',0)',result:Math.round(c.lembur)};
  gaji('TOTAL GAJI','',{formula:'SUM(G'+g0+':G'+(r-1)+')',result:Math.round(c.total)},'total');
  r++;
  gaji('Uang Makan',c.hari+' hari × '+rupiah(s.uangMakan),Math.round(c.makan),'makan');
  r++;
  ws.mergeCells('A'+r+':H'+r);var nt=ws.getCell('A'+r);
  nt.value='Uang Makan dibayarkan terpisah dari Total Gaji. Hari OFF/Libur tidak dihitung sebagai hari kerja.';
  nt.font={italic:true,size:9,color:{argb:GREY}};nt.alignment={wrapText:true};ws.getRow(r).height=26;

  ws.views=[{showGridLines:false,state:'frozen',ySplit:head}];
  ws.pageSetup.printTitlesRow=head+':'+head;

  var fname='DGaji_'+safeName(nama)+'_'+k+'.xlsx';
  wb.xlsx.writeBuffer().then(function(buf){
    var blob=new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=fname;
    document.body.appendChild(a);a.click();
    setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},2000);
    toast('Mengunduh Excel ✓');
  }).catch(function(){toast('Gagal membuat Excel — coba lagi');});}
function copyRekap(){
  var k=exportKey(),c=calcPeriod(k),recs=c.recs.slice().sort(function(a,b){return a.tanggal.localeCompare(b.tanggal)});
  if(!recs.length){toast('Tidak ada data');return;}
  var s=c.s,L=['DGAJI — '+(s.nama||'-'),'Periode: '+periodLabel(k)+' ('+periodNote(k)+')',''];
  recs.forEach(function(r){var hr=HARI[new Date(r.tanggal+'T00:00:00').getDay()];
    if(r.off)L.push(r.tanggal+' ('+hr+') | OFF/Libur');
    else L.push(r.tanggal+' ('+hr+') | DTH '+(r.atas50?'>50':'≤50')+' | pulang '+fmt(r.jamPulang)+(r.pengambilan?' | +Pengambilan':'')+' = '+jamTxt(r.total));});
  L.push('','Total Jam Kerja: '+jamTxt(c.totJam),'','Gaji Pokok: '+rupiah(s.gajiPokok),'T. Berkala: '+rupiah(s.tBerkala),
    'T. Hadir ('+c.hari+' hari × '+rupiah(s.tHadir)+'): '+rupiah(c.hadir),'Uang Lembur: '+rupiah(c.lembur),'TOTAL GAJI: '+rupiah(c.total),'','Uang Makan ('+c.hari+' hari × '+rupiah(s.uangMakan)+'): '+rupiah(c.makan));
  var txt=L.join('\n');
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(txt).then(function(){toast('Rekap disalin ✓')},function(){fb(txt)});
  else fb(txt);
  function fb(t){var ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();
    try{document.execCommand('copy');toast('Rekap disalin ✓')}catch(e){toast('Gagal menyalin')}document.body.removeChild(ta);}}

/* ========== TOAST & RIPPLE ========== */
function toast(m){var t=$('toast');t.textContent=m;t.classList.add('show');clearTimeout(t._t);t._t=setTimeout(function(){t.classList.remove('show')},2000);}
function ripple(e){var b=e.currentTarget,r=b.getBoundingClientRect(),s=Math.max(r.width,r.height);
  var sp=document.createElement('span');sp.className='rp';sp.style.width=sp.style.height=s+'px';
  sp.style.left=((e.touches?e.touches[0].clientX:e.clientX)-r.left-s/2)+'px';
  sp.style.top=((e.touches?e.touches[0].clientY:e.clientY)-r.top-s/2)+'px';
  b.appendChild(sp);setTimeout(function(){sp.remove()},600);}

/* ========== CURRENCY & FORM ========== */
function bindCurrency(){document.querySelectorAll('input.rp').forEach(function(inp){
  inp.addEventListener('input',function(){var n=parseRp(this.value);this.value=n?n.toLocaleString('id-ID'):'';
    this.setSelectionRange(this.value.length,this.value.length);});});}
var SF=['gajiPokok','tHadir','tBerkala','tLembur','uangMakan'];
function fillForm(p,s){$(p+'_nama').value=s.nama||'';SF.forEach(function(k){$(p+'_'+k).value=(s[k]||0)?s[k].toLocaleString('id-ID'):'';});}
function readForm(p){var o={nama:$(p+'_nama').value.trim()};SF.forEach(function(k){o[k]=parseRp($(p+'_'+k).value);});return o;}

/* ========== TAB ========== */
function showTab(name){
  ['hitung','gaji','riwayat'].forEach(function(n){$('tab-'+n).hidden=(n!==name);});
  document.querySelectorAll('.tab').forEach(function(b){b.classList.toggle('on',b.dataset.tab===name);});
  $('screens').scrollTop=0;
  if(name==='gaji'){renderGaji();countUp($('gajiBig'),lastGaji,function(v){return rupiah(v);});}
  if(name==='riwayat')renderCal();}

/* ========== EVENTS ========== */
function bind(){
  $('off').addEventListener('change',renderResult);
  $('segDth').addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;
    this.querySelectorAll('button').forEach(function(x){x.classList.remove('on')});b.classList.add('on');
    this.classList.toggle('pos1',b.dataset.v==='atas');renderResult();});
  $('tanggal').addEventListener('change',function(){renderHari();renderHitungState();});
  var pul=$('pulang');
  pul.addEventListener('input',function(){var at=this.selectionStart>=this.value.length;this.value=maskTime(this.value);
    if(at)this.setSelectionRange(this.value.length,this.value.length);renderEcho();renderResult();});
  pul.addEventListener('blur',function(){var m=parseJam(this.value);if(m!=null)this.value=fmt(m);renderEcho();renderResult();});
  $('pengambilan').addEventListener('change',renderResult);

  $('saveBtn').addEventListener('click',function(){
    var d=$('tanggal').value;if(!d){toast('Isi tanggal dulu');return;}
    var ada=recByDate(d);
    if(ada&&ada.id!==editingId){toast('Tanggal ini sudah ada datanya');renderHitungState();return;}
    var off=isOff(),rec={id:editingId||(Date.now()+''+Math.floor(Math.random()*999)),tanggal:d,off:off};
    if(off){rec.type=dayType(d);rec.total=0;}
    else{var i=curInput();if(i.jamPulang==null){toast('Jam pulang belum benar');return;}
      var r=hitung(i);rec.type=i.type;rec.atas50=r.atas50;rec.jamPulang=i.jamPulang;rec.pengambilan=i.pengambilan;rec.total=r.total;}
    var wasEdit=!!editingId;
    var recs=getRecs().filter(function(x){return x.id!==rec.id;});recs.push(rec);setRecs(recs);
    editingId=null;curPeriod=periodKey(d);selDate=d;var dt=new Date(d+'T00:00:00');calY=dt.getFullYear();calM=dt.getMonth();
    refreshAll();toast(wasEdit?'Perubahan disimpan ✓':(off?'Hari OFF tersimpan ✓':'Tersimpan ✓ '+jamTxt(rec.total)));});
  $('cancelEdit').addEventListener('click',stopEdit);
  $('doneEdit').addEventListener('click',function(){var r=recByDate($('tanggal').value);if(r)startEdit(r);});
  $('doneSee').addEventListener('click',function(){var d=$('tanggal').value,dt=new Date(d+'T00:00:00');
    selDate=d;calY=dt.getFullYear();calM=dt.getMonth();showTab('riwayat');});

  // gaji: geser periode
  $('perPrev').addEventListener('click',function(){curPeriod=shiftPeriod(curPeriod,-1);renderGaji();countUp($('gajiBig'),lastGaji,rupiah);});
  $('perNext').addEventListener('click',function(){curPeriod=shiftPeriod(curPeriod,1);renderGaji();countUp($('gajiBig'),lastGaji,rupiah);});

  // riwayat: kalender
  $('calPrev').addEventListener('click',function(){moveCal(-1);});
  $('calNext').addEventListener('click',function(){moveCal(1);});
  $('calGrid').addEventListener('click',function(e){var b=e.target.closest('.cd[data-d]');if(!b)return;
    selDate=b.dataset.d;document.querySelectorAll('.cd.sel').forEach(function(x){x.classList.remove('sel')});
    b.classList.add('sel');renderDay();});
  var sx=null,sy=null,card=document.querySelector('.cal-card');
  card.addEventListener('touchstart',function(e){sx=e.touches[0].clientX;sy=e.touches[0].clientY;},{passive:true});
  card.addEventListener('touchend',function(e){if(sx===null)return;var dx=e.changedTouches[0].clientX-sx,dy=e.changedTouches[0].clientY-sy;
    if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.5)moveCal(dx<0?1:-1);sx=null;},{passive:true});
  $('dayCard').addEventListener('click',function(e){
    var t=e.target.closest('button');if(!t)return;
    if(t.id==='dayAdd'){$('tanggal').value=selDate;editingId=null;resetForm();renderHari();renderEcho();renderHitungState();showTab('hitung');}
    if(t.id==='dayEdit'){var r=recByDate(selDate);if(r)startEdit(r);}
    if(t.id==='dayDel'){
      if(delArm!==selDate){delArm=selDate;t.textContent='Yakin hapus? Ketuk lagi';t.classList.add('armed');
        setTimeout(function(){if(t.isConnected&&delArm===selDate){delArm=null;t.textContent='🗑 Hapus';t.classList.remove('armed');}},3000);return;}
      var r=recByDate(selDate);setRecs(getRecs().filter(function(x){return x.tanggal!==selDate;}));
      if(r&&r.id===editingId)editingId=null;refreshAll();toast('Data dihapus');}
  });

  $('dlBtn').addEventListener('click',downloadExcel);
  $('copyBtn').addEventListener('click',copyRekap);

  $('themeBtn').addEventListener('click',function(){var cur=document.documentElement.getAttribute('data-theme');
    var dark=cur==='dark'||(!cur&&!matchMedia('(prefers-color-scheme:light)').matches);var next=dark?'light':'dark';
    document.documentElement.setAttribute('data-theme',next);ls(function(){localStorage.setItem(K_TH,next)});});

  var sm=$('setModal');
  $('setBtn').addEventListener('click',function(){fillForm('st',getSet()||{});updateInstallUI();sm.classList.add('show');});
  $('setCancel').addEventListener('click',function(){sm.classList.remove('show')});
  $('setSave').addEventListener('click',function(){var o=readForm('st');if(!o.nama){toast('Nama tidak boleh kosong');return;}
    saveSet(o);applyGreet();refreshAll();sm.classList.remove('show');toast('Pengaturan disimpan ✓');});
  sm.addEventListener('click',function(e){if(e.target===sm)sm.classList.remove('show')});

  $('obStart').addEventListener('click',function(){var o=readForm('ob');if(!o.nama){toast('Isi nama dulu');return;}
    saveSet(o);showApp();refreshAll();});

  document.querySelectorAll('.tab').forEach(function(b){b.addEventListener('click',function(){showTab(this.dataset.tab);});});
  document.addEventListener('pointerdown',function(e){var b=e.target.closest('.btn');if(b)ripple({currentTarget:b,clientX:e.clientX,clientY:e.clientY});});
  bindCurrency();}

function applyGreet(){var s=getSet()||{};$('greet').textContent='Hai, '+(s.nama||'')+' 👋';}
function showApp(){applyGreet();$('onboard').hidden=true;$('app').hidden=false;}

/* ========== PWA ========== */
function registerSW(){
  if(!('serviceWorker' in navigator))return;
  try{
    var reloaded=false, hadController=!!navigator.serviceWorker.controller;
    // saat service worker baru menggantikan yang lama, muat ulang sekali supaya versi baru langsung tampil
    navigator.serviceWorker.addEventListener('controllerchange',function(){
      if(reloaded||!hadController)return;reloaded=true;window.location.reload();
    });
    window.addEventListener('load',function(){
      navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).then(function(reg){
        reg.update().catch(function(){});
      }).catch(function(){});
    });
  }catch(e){}
}

var deferredPrompt=null, installedFlag=false;
function isStandalone(){try{return matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;}catch(e){return false;}}
function isIOS(){return /iphone|ipad|ipod/i.test(navigator.userAgent);}
function updateInstallUI(){
  var btn=$('installBtn'),st=$('installState');if(!btn)return;
  if(isStandalone()||installedFlag){btn.hidden=true;st.hidden=false;st.textContent='✓ Aplikasi sudah terpasang';return;}
  btn.hidden=false;st.hidden=true;
}
function initInstall(){
  window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();deferredPrompt=e;updateInstallUI();});
  window.addEventListener('appinstalled',function(){installedFlag=true;deferredPrompt=null;updateInstallUI();toast('Aplikasi terpasang ✓');});
  var btn=$('installBtn');
  if(btn)btn.addEventListener('click',function(){
    if(deferredPrompt){deferredPrompt.prompt();deferredPrompt.userChoice.then(function(c){
      if(c&&c.outcome==='accepted')toast('Memasang aplikasi…');deferredPrompt=null;updateInstallUI();});}
    else if(isIOS())toast('Safari: tombol Bagikan → "Tambah ke Layar Utama"');
    else toast('Menu browser (⋮) → "Pasang aplikasi" / "Tambah ke Layar Utama"');
  });
  updateInstallUI();
}

/* ========== INIT ========== */
(function(){
  var th=ls(function(){return localStorage.getItem(K_TH)},null);
  if(th)document.documentElement.setAttribute('data-theme',th);
  dedupe();recalcAll();
  var t=todayStr();$('tanggal').value=t;
  curPeriod=periodKey(t);selDate=t;var dt=new Date(t+'T00:00:00');calY=dt.getFullYear();calM=dt.getMonth();
  bind();registerSW();initInstall();
  renderHari();renderEcho();renderResult();
  if(getSet()){showApp();refreshAll();}else{$('onboard').hidden=false;}
})();
