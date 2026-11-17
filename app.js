"use strict";
/* ============================================================
   DGAJI — DAHANA
   Hitung jam jaman + gaji. Penyimpanan: localStorage (per perangkat)
   Periode gaji: tgl 21 bulan lalu – 20 bulan ini (tutup buku tgl 20)
   ============================================================ */

var K_REC='dgaji_rec_v1', K_SET='dgaji_set_v1', K_TH='dgaji_theme_v1';
var CUT=17*60; // jam 5 sore
var HARI=['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
var BULAN=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
var BLN=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

/* ---------- storage ---------- */
function ls(fn,d){try{return fn()}catch(e){return d}}
function getRecs(){return ls(function(){return JSON.parse(localStorage.getItem(K_REC))||[]},[])}
function setRecs(r){ls(function(){localStorage.setItem(K_REC,JSON.stringify(r))})}
function getSet(){return ls(function(){return JSON.parse(localStorage.getItem(K_SET))},null)}
function saveSet(s){ls(function(){localStorage.setItem(K_SET,JSON.stringify(s))})}

/* ---------- format ---------- */
function fmt(m){var h=Math.floor(m/60),mm=m%60;return (h<10?'0':'')+h+':'+(mm<10?'0':'')+mm;}
function jamNum(n){return (Math.round(n*100)/100).toString().replace('.',',');}
function jamTxt(n){return jamNum(n)+' jam';}
function rupiah(n){return 'Rp '+Math.round(n||0).toLocaleString('id-ID');}
function parseRp(s){var d=String(s).replace(/\D/g,'');return d?parseInt(d,10):0;}
function $(id){return document.getElementById(id);}

/* ---------- mask + parse jam pulang ---------- */
function maskTime(str){var d=String(str).replace(/\D/g,'');if(!d)return '';
  var hl=(d.charAt(0)>='3')?1:2;if(d.length<=hl)return d;return d.slice(0,hl)+':'+d.slice(hl,hl+2);}
function parseJam(raw){var d=String(raw).replace(/\D/g,'');if(!d)return null;
  var hl=(d.charAt(0)>='3')?1:2;var h=parseInt(d.slice(0,hl),10);var m=parseInt(d.slice(hl,hl+2)||'0',10);
  if(isNaN(h)||isNaN(m)||m>59)return null;if(h>=1&&h<=11)h+=12;if(h>23)return null;return h*60+m;}

/* ---------- hari & periode ---------- */
function dayType(s){if(!s)return 'biasa';var g=new Date(s+'T00:00:00').getDay();
  if(g===0)return 'minggu';if(g===6)return 'sabtu';return 'biasa';}
// periode gaji: tgl >=21 masuk ke periode bulan BERIKUTNYA (tutup buku tgl 20)
function periodKey(dateStr){
  var d=new Date(dateStr+'T00:00:00');var y=d.getFullYear(),m=d.getMonth();
  if(d.getDate()>=21){m++;if(m>11){m=0;y++;}}
  return y+'-'+String(m+1).padStart(2,'0');
}
function periodLabel(key){var p=key.split('-');return BULAN[parseInt(p[1],10)-1]+' '+p[0];}
function periodNote(key){var p=key.split('-'),y=+p[0],m=+p[1]-1;
  var sm=m-1,sy=y;if(sm<0){sm=11;sy--;}
  return '21 '+BLN[sm]+' '+(sy!==y?sy+' ':'')+'– 20 '+BLN[m]+' '+y;}

/* ====================== INTI JAM JAMAN ====================== */
function hitung(o){
  var lewat=o.jamPulang!=null&&o.jamPulang>CUT;
  var atas50=lewat?true:o.atas50;
  var base=0,lembur=0,bulat=o.jamPulang,kalc='',rM=0;
  if(lewat){rM=Math.ceil((o.jamPulang-CUT)/30)*30;bulat=CUT+rM;}
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
  return {base:base,lembur:lembur,ambil:amb,total:base+lembur+amb,
          bulat:bulat,lewat:lewat,atas50:atas50,kalc:kalc,forced:(lewat&&!o.atas50)};
}

function isOff(){return $('off').checked;}
function curInput(){
  return {type:dayType($('tanggal').value),
    atas50:$('segDth').querySelector('.on').dataset.v==='atas',
    jamPulang:parseJam($('pulang').value),
    pengambilan:$('pengambilan').checked};
}

/* ====================== RENDER INPUT/HASIL ====================== */
function renderHari(){
  var t=$('tanggal').value,b=$('hariBadge');b.className='hari-badge';
  if(!t){$('hariNama').textContent='—';$('hariTipe').textContent='hari';return;}
  var g=new Date(t+'T00:00:00').getDay(),ty=dayType(t);
  $('hariNama').textContent=HARI[g];$('hariTipe').textContent=ty==='biasa'?'Hari Biasa':ty;
  if(ty!=='biasa')b.classList.add(ty);
}
function renderEcho(){
  var raw=$('pulang').value,el=$('jamEcho'),m=parseJam(raw);
  if(!raw){el.textContent='';el.className='jam-echo';return;}
  if(m==null){el.className='jam-echo bad';el.textContent='Format jam belum terbaca — contoh 17:12';return;}
  el.className='jam-echo';
  if(m>CUT)el.innerHTML='Pukul <b>'+fmt(m)+'</b> · <span class="ov">lembur, dibulatkan '+fmt(Math.ceil((m-CUT)/30)*30+CUT)+'</span>';
  else el.innerHTML='Pukul <b>'+fmt(m)+'</b> · '+(m===CUT?'pas jam 5':'pulang normal');
}
var lastTotal=null;
function renderResult(){
  var res=$('result'),big=$('bigTotal'),bd=$('breakdown'),cap=res.querySelector('.cap');
  if(isOff()){
    res.classList.add('off');$('offWrap').classList.add('disabled');
    cap.textContent='Status Hari Ini';big.innerHTML='OFF <small>/ libur</small>';
    bd.innerHTML='<div class="brow"><span>Hari libur / tidak kerja</span><span>0 jam</span></div>';
    lastTotal=null;return;
  }
  res.classList.remove('off');$('offWrap').classList.remove('disabled');cap.textContent='Jam Jaman Hari Ini';
  var i=curInput();
  if(i.jamPulang==null){big.innerHTML='—';bd.innerHTML='';lastTotal=null;return;}
  var r=hitung(i);
  big.innerHTML=jamNum(r.total)+' <small>jam</small>';
  if(lastTotal!==null&&lastTotal!==r.total){big.classList.remove('bump');void big.offsetWidth;big.classList.add('bump');}
  lastTotal=r.total;
  var h='';
  h+='<div class="brow"><span>Dasar — '+r.kalc+'</span><span>'+jamTxt(r.base)+'</span></div>';
  if(r.lembur>0)h+='<div class="brow"><span>Lembur (pulang → '+fmt(r.bulat)+')</span><span>+'+jamTxt(r.lembur)+'</span></div>';
  if(r.ambil>0)h+='<div class="brow"><span>Pengambilan bahan peledak</span><span>+1 jam</span></div>';
  h+='<div class="brow tot"><span>Total Jam Jaman</span><span>'+jamTxt(r.total)+'</span></div>';
  if(r.forced)h+='<div class="note">⚠️ <span>Pulang lewat jam 5 otomatis dihitung <b>di atas 50 Ton</b>.</span></div>';
  bd.innerHTML=h;
}

/* ====================== PERIODE & GAJI ====================== */
function allPeriods(){
  var recs=getRecs(),keys={};
  recs.forEach(function(r){keys[periodKey(r.tanggal)]=1;});
  keys[periodKey($('tanggal').value||new Date().toISOString().slice(0,10))]=1;
  return Object.keys(keys).sort().reverse();
}
function renderPeriods(){
  var sel=$('periodSel'),cur=sel.value,arr=allPeriods();
  sel.innerHTML=arr.map(function(k){return '<option value="'+k+'">'+periodLabel(k)+'</option>';}).join('');
  if(cur&&arr.indexOf(cur)>-1)sel.value=cur;
  else sel.value=periodKey($('tanggal').value||new Date().toISOString().slice(0,10));
}
function periodRecs(key){return getRecs().filter(function(r){return periodKey(r.tanggal)===key;});}

function renderGaji(){
  var key=$('periodSel').value;if(!key){renderPeriods();key=$('periodSel').value;}
  $('periodNote').textContent=periodNote(key);
  var recs=periodRecs(key),totJam=0,hariKerja=0;
  recs.forEach(function(r){totJam+=r.total||0;if(!r.off)hariKerja++;});
  $('sumJam').textContent=jamNum(totJam);
  $('sumHari').textContent=hariKerja;

  var s=getSet()||{};
  var lembur=totJam*(s.tLembur||0);
  var totalGaji=(s.gajiPokok||0)+(s.tHadir||0)+(s.tBerkala||0)+lembur;
  $('gajiBig').textContent=rupiah(totalGaji);
  $('gajiBreak').innerHTML=
    '<div class="money-row"><span class="k">Gaji Pokok</span><span class="v">'+rupiah(s.gajiPokok)+'</span></div>'+
    '<div class="money-row"><span class="k">T. Hadir</span><span class="v">'+rupiah(s.tHadir)+'</span></div>'+
    '<div class="money-row"><span class="k">T. Berkala</span><span class="v">'+rupiah(s.tBerkala)+'</span></div>'+
    '<div class="money-row"><span class="k">Uang Lembur <small>'+jamNum(totJam)+' jam × '+rupiah(s.tLembur)+'</small></span><span class="v">'+rupiah(lembur)+'</span></div>'+
    '<div class="money-row tot"><span class="k">Total Gaji</span><span class="v">'+rupiah(totalGaji)+'</span></div>';
  $('makanAmt').textContent=rupiah(s.uangMakan);
}

/* ====================== RIWAYAT ====================== */
function renderRecs(){
  var key=$('periodSel').value,list=$('recList');
  var recs=periodRecs(key).sort(function(a,b){return (b.tanggal||'').localeCompare(a.tanggal||'')});
  if(!recs.length){list.innerHTML='<div class="empty">Belum ada catatan di periode ini.<br>Isi data lalu tekan <b>Simpan</b>.</div>';return;}
  list.innerHTML=recs.map(function(r,idx){
    var dt=new Date(r.tanggal+'T00:00:00');
    var dStr=dt.toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    var cap=r.type?r.type.charAt(0).toUpperCase()+r.type.slice(1):'';
    var jamHtml=r.off?'<span class="rec-jam libur">Libur</span>':'<span class="rec-jam">'+jamTxt(r.total)+'</span>';
    var tags=r.off
      ? '<span class="chip off">OFF / Libur</span>'
      : '<span class="chip day '+(r.type==='biasa'?'':r.type)+'">'+(r.type==='biasa'?'Hari Biasa':cap)+'</span>'+
        '<span class="chip">DTH '+(r.atas50?'> 50':'≤ 50')+' Ton</span>'+
        '<span class="chip">Pulang '+fmt(r.jamPulang)+'</span>'+
        (r.pengambilan?'<span class="chip amb">+ Pengambilan</span>':'');
    return '<div class="rec" style="animation-delay:'+(idx*0.03)+'s">'+
      '<div class="rec-top"><span class="rec-date">'+dStr+'</span>'+jamHtml+'</div>'+
      '<div class="rec-tags">'+tags+'</div>'+
      '<div class="rec-act"><button data-edit="'+r.id+'">✎ Edit</button>'+
      '<button class="del" data-del="'+r.id+'">🗑 Hapus</button></div></div>';
  }).join('');
}

function refreshAll(){renderPeriods();renderGaji();renderRecs();}

/* ====================== EXPORT EXCEL ====================== */
function safeName(s){return (s||'karyawan').replace(/[^\w\-]+/g,'_').replace(/^_+|_+$/g,'')||'karyawan';}
function downloadExcel(){
  if(typeof XLSX==='undefined'){toast('Library Excel belum siap');return;}
  var key=$('periodSel').value,recs=periodRecs(key);
  if(!recs.length){toast('Tidak ada data di periode ini');return;}
  recs.sort(function(a,b){return (a.tanggal||'').localeCompare(b.tanggal||'')});
  var s=getSet()||{},nama=s.nama||'-';
  var totJam=0;recs.forEach(function(r){totJam+=r.total||0;});
  var lembur=totJam*(s.tLembur||0);
  var totalGaji=(s.gajiPokok||0)+(s.tHadir||0)+(s.tBerkala||0)+lembur;

  var aoa=[
    ['DGAJI — DAHANA'],
    ['Nama',nama],
    ['Periode',periodLabel(key)+'  ('+periodNote(key)+')'],
    [],
    ['Tanggal','Hari','Status','DTH','Jam Pulang','Pengambilan','Jam Jaman']
  ];
  recs.forEach(function(r){
    var hr=HARI[new Date(r.tanggal+'T00:00:00').getDay()];
    if(r.off)aoa.push([r.tanggal,hr,'OFF / Libur','','','',0]);
    else aoa.push([r.tanggal,hr,'Kerja',(r.atas50?'> 50 Ton':'≤ 50 Ton'),fmt(r.jamPulang),(r.pengambilan?'Ya':'-'),r.total]);
  });
  aoa.push([]);
  aoa.push(['','','','','','TOTAL JAM JAMAN',Math.round(totJam*100)/100]);
  aoa.push([]);
  aoa.push(['RINCIAN GAJI']);
  aoa.push(['Gaji Pokok',s.gajiPokok||0]);
  aoa.push(['T. Hadir',s.tHadir||0]);
  aoa.push(['T. Berkala',s.tBerkala||0]);
  aoa.push(['Uang Lembur ('+jamNum(totJam)+' jam x '+(s.tLembur||0)+')',Math.round(lembur)]);
  aoa.push(['TOTAL GAJI',Math.round(totalGaji)]);
  aoa.push([]);
  aoa.push(['Uang Makan (dipisah)',s.uangMakan||0]);

  var ws=XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols']=[{wch:24},{wch:10},{wch:12},{wch:10},{wch:11},{wch:12},{wch:11}];
  ws['!merges']=[{s:{r:0,c:0},e:{r:0,c:6}}];
  var wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'DGaji');
  var fname='DGaji_'+safeName(nama)+'_'+key+'.xlsx';
  try{XLSX.writeFile(wb,fname);toast('Mengunduh '+fname);}
  catch(e){toast('Unduhan diblokir di preview — jalan saat di hosting');}
}

/* ====================== TOAST & RIPPLE ====================== */
function toast(m){var t=$('toast');t.textContent=m;t.classList.add('show','ok');
  clearTimeout(t._t);t._t=setTimeout(function(){t.classList.remove('show')},2000);}
function ripple(e){var b=e.currentTarget,r=b.getBoundingClientRect(),s=Math.max(r.width,r.height);
  var sp=document.createElement('span');sp.className='rp';sp.style.width=sp.style.height=s+'px';
  sp.style.left=((e.touches?e.touches[0].clientX:e.clientX)-r.left-s/2)+'px';
  sp.style.top=((e.touches?e.touches[0].clientY:e.clientY)-r.top-s/2)+'px';
  b.appendChild(sp);setTimeout(function(){sp.remove()},600);}

/* ---------- currency live format ---------- */
function bindCurrency(){
  document.querySelectorAll('input.rp').forEach(function(inp){
    inp.addEventListener('input',function(){
      var n=parseRp(this.value);this.value=n?n.toLocaleString('id-ID'):'';
      this.setSelectionRange(this.value.length,this.value.length);
    });
  });
}

/* ---------- settings form ---------- */
var SF=['gajiPokok','tHadir','tBerkala','tLembur','uangMakan'];
function fillForm(prefix,s){
  $(prefix+'_nama').value=s.nama||'';
  SF.forEach(function(k){$(prefix+'_'+k).value=(s[k]||0)?(s[k]).toLocaleString('id-ID'):'';});
}
function readForm(prefix){
  var o={nama:$(prefix+'_nama').value.trim()};
  SF.forEach(function(k){o[k]=parseRp($(prefix+'_'+k).value);});
  return o;
}

/* ====================== EVENTS ====================== */
function bind(){
  $('off').addEventListener('change',renderResult);
  $('segDth').addEventListener('click',function(e){
    var b=e.target.closest('button');if(!b)return;
    this.querySelectorAll('button').forEach(function(x){x.classList.remove('on')});
    b.classList.add('on');this.classList.toggle('pos1',b.dataset.v==='atas');renderResult();
  });
  $('tanggal').addEventListener('change',function(){renderHari();renderResult();refreshAll();});
  var pul=$('pulang');
  pul.addEventListener('input',function(){var at=this.selectionStart>=this.value.length;
    this.value=maskTime(this.value);if(at)this.setSelectionRange(this.value.length,this.value.length);
    renderEcho();renderResult();});
  pul.addEventListener('blur',function(){var m=parseJam(this.value);if(m!=null)this.value=fmt(m);renderEcho();renderResult();});
  $('pengambilan').addEventListener('change',renderResult);

  $('saveBtn').addEventListener('click',function(){
    if(!$('tanggal').value){toast('Isi tanggal dulu');return;}
    var off=isOff(),rec={id:Date.now()+''+Math.floor(Math.random()*999),
      tanggal:$('tanggal').value,off:off};
    if(off){rec.type=dayType($('tanggal').value);rec.total=0;}
    else{
      var i=curInput();if(i.jamPulang==null){toast('Jam pulang belum benar');return;}
      var r=hitung(i);rec.type=i.type;rec.atas50=r.atas50;rec.jamPulang=i.jamPulang;
      rec.pengambilan=i.pengambilan;rec.total=r.total;
    }
    var recs=getRecs();
    // ganti kalau tanggal sama sudah ada? biarkan user kelola manual -> tambah baru
    recs.push(rec);setRecs(recs);refreshAll();
    toast(off?'Hari OFF tersimpan':'Tersimpan ✓ '+jamTxt(rec.total));
  });

  $('recList').addEventListener('click',function(e){
    var del=e.target.getAttribute('data-del'),ed=e.target.getAttribute('data-edit');
    if(del){setRecs(getRecs().filter(function(r){return r.id!==del}));refreshAll();toast('Dihapus');}
    if(ed){
      var r=getRecs().filter(function(x){return x.id===ed})[0];if(!r)return;
      $('tanggal').value=r.tanggal;$('off').checked=!!r.off;
      if(!r.off){
        var seg=$('segDth');
        seg.querySelectorAll('button').forEach(function(b){b.classList.toggle('on',(b.dataset.v==='atas')===!!r.atas50)});
        seg.classList.toggle('pos1',!!r.atas50);
        $('pulang').value=r.jamPulang!=null?fmt(r.jamPulang):'17:00';
        $('pengambilan').checked=!!r.pengambilan;
      }
      setRecs(getRecs().filter(function(x){return x.id!==ed}));
      renderHari();renderEcho();renderResult();refreshAll();
      window.scrollTo({top:0,behavior:'smooth'});toast('Dimuat untuk diedit — Simpan lagi');
    }
  });

  $('periodSel').addEventListener('change',function(){renderGaji();renderRecs();});
  $('dlBtn').addEventListener('click',downloadExcel);

  $('copyBtn').addEventListener('click',function(){
    var key=$('periodSel').value,recs=periodRecs(key);
    if(!recs.length){toast('Tidak ada data');return;}
    recs.sort(function(a,b){return (a.tanggal||'').localeCompare(b.tanggal||'')});
    var s=getSet()||{},totJam=0;recs.forEach(function(r){totJam+=r.total||0;});
    var lembur=totJam*(s.tLembur||0),totalGaji=(s.gajiPokok||0)+(s.tHadir||0)+(s.tBerkala||0)+lembur;
    var L=['DGAJI — '+(s.nama||'-'),'Periode: '+periodLabel(key)+' ('+periodNote(key)+')',''];
    recs.forEach(function(r){var hr=HARI[new Date(r.tanggal+'T00:00:00').getDay()];
      if(r.off)L.push(r.tanggal+' ('+hr+') | OFF/Libur');
      else L.push(r.tanggal+' ('+hr+') | DTH '+(r.atas50?'>50':'≤50')+' | pulang '+fmt(r.jamPulang)+(r.pengambilan?' | +Ambil':'')+' = '+jamTxt(r.total));
    });
    L.push('','Total Jam Jaman: '+jamTxt(totJam),'',
      'Gaji Pokok: '+rupiah(s.gajiPokok),'T. Hadir: '+rupiah(s.tHadir),'T. Berkala: '+rupiah(s.tBerkala),
      'Uang Lembur: '+rupiah(lembur),'TOTAL GAJI: '+rupiah(totalGaji),'','Uang Makan (dipisah): '+rupiah(s.uangMakan));
    var txt=L.join('\n');
    if(navigator.clipboard&&navigator.clipboard.writeText)
      navigator.clipboard.writeText(txt).then(function(){toast('Rekap disalin ✓')},function(){fb(txt)});
    else fb(txt);
    function fb(t){var ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();
      try{document.execCommand('copy');toast('Rekap disalin ✓')}catch(e){toast('Gagal menyalin')}document.body.removeChild(ta);}
  });

  // tema
  $('themeBtn').addEventListener('click',function(){
    var cur=document.documentElement.getAttribute('data-theme');
    var dark=cur==='dark'||(!cur&&!matchMedia('(prefers-color-scheme:light)').matches);
    var next=dark?'light':'dark';document.documentElement.setAttribute('data-theme',next);
    ls(function(){localStorage.setItem(K_TH,next)});
  });

  // pengaturan
  var sm=$('setModal');
  $('setBtn').addEventListener('click',function(){fillForm('st',getSet()||{});sm.classList.add('show');});
  $('setCancel').addEventListener('click',function(){sm.classList.remove('show')});
  $('setSave').addEventListener('click',function(){
    var o=readForm('st');if(!o.nama){toast('Nama tidak boleh kosong');return;}
    saveSet(o);applyGreet();refreshAll();sm.classList.remove('show');toast('Pengaturan disimpan ✓');
  });
  sm.addEventListener('click',function(e){if(e.target===sm)sm.classList.remove('show')});

  // onboarding
  $('obStart').addEventListener('click',function(){
    var o=readForm('ob');if(!o.nama){toast('Isi nama dulu');return;}
    saveSet(o);showApp();refreshAll();
  });

  document.querySelectorAll('.btn').forEach(function(b){b.addEventListener('pointerdown',ripple);});
  bindCurrency();
}

function applyGreet(){var s=getSet()||{};$('greet').textContent='Hai, '+(s.nama||'')+' 👋';}
function showApp(){applyGreet();$('onboard').hidden=true;$('app').hidden=false;}

/* ====================== INIT ====================== */
(function(){
  var th=ls(function(){return localStorage.getItem(K_TH)},null);
  if(th)document.documentElement.setAttribute('data-theme',th);
  var t=new Date();t.setMinutes(t.getMinutes()-t.getTimezoneOffset());
  $('tanggal').value=t.toISOString().slice(0,10);
  bind();
  renderHari();renderEcho();renderResult();
  if(getSet()){showApp();refreshAll();}
  else{ $('onboard').hidden=false; }
})();
