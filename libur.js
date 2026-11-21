/* ============================================================
   DAFTAR TANGGAL MERAH — sesuai SKB 3 Menteri
   'n' = Libur Nasional (tanggal merah)   'c' = Cuti Bersama
   Untuk menambah tahun baru: salin pola di bawah, lalu tambahkan
   tahunnya ke LIBUR_TAHUN.
   ============================================================ */
var LIBUR_TAHUN = [2026];
var LIBUR = {
  /* ---------- 2026 ---------- */
  '2026-01-01': ['n', 'Tahun Baru Masehi'],
  '2026-01-16': ['n', 'Isra Mikraj Nabi Muhammad SAW'],
  '2026-02-16': ['c', 'Cuti Bersama Tahun Baru Imlek'],
  '2026-02-17': ['n', 'Tahun Baru Imlek 2577 Kongzili'],
  '2026-03-18': ['c', 'Cuti Bersama Hari Suci Nyepi'],
  '2026-03-19': ['n', 'Hari Suci Nyepi (Tahun Baru Saka 1948)'],
  '2026-03-20': ['c', 'Cuti Bersama Idul Fitri'],
  '2026-03-21': ['n', 'Hari Raya Idul Fitri 1447 H'],
  '2026-03-22': ['n', 'Hari Raya Idul Fitri 1447 H'],
  '2026-03-23': ['c', 'Cuti Bersama Idul Fitri'],
  '2026-03-24': ['c', 'Cuti Bersama Idul Fitri'],
  '2026-04-03': ['n', 'Wafat Yesus Kristus'],
  '2026-04-05': ['n', 'Kebangkitan Yesus Kristus (Paskah)'],
  '2026-05-01': ['n', 'Hari Buruh Internasional'],
  '2026-05-14': ['n', 'Kenaikan Yesus Kristus'],
  '2026-05-15': ['c', 'Cuti Bersama Kenaikan Yesus Kristus'],
  '2026-05-27': ['n', 'Hari Raya Idul Adha 1447 H'],
  '2026-05-28': ['c', 'Cuti Bersama Idul Adha'],
  '2026-05-31': ['n', 'Hari Raya Waisak 2570 BE'],
  '2026-06-01': ['n', 'Hari Lahir Pancasila'],
  '2026-06-16': ['n', 'Tahun Baru Islam 1448 H'],
  '2026-08-17': ['n', 'Hari Kemerdekaan Republik Indonesia'],
  '2026-08-25': ['n', 'Maulid Nabi Muhammad SAW'],
  '2026-12-24': ['c', 'Cuti Bersama Hari Raya Natal'],
  '2026-12-25': ['n', 'Hari Raya Natal']
};
function liburOf(d) { return LIBUR[d] || null; }
function liburTersedia(y) { return LIBUR_TAHUN.indexOf(+y) > -1; }
