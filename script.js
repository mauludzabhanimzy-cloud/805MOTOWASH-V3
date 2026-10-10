const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwnVwiMnnas3Xo6UsjIbnFNLs0L0sFCw0VB4PyfqtTtrbWz1Sz25qWDXSQxtfbAv6CS/exec";

const layanan = {
  motor_kecil: { nama: "Motor Kecil", tarif: 25000, upah: 8000 },
  motor_besar: { nama: "Motor Besar", tarif: 30000, upah: 11000 },
  mobil: { nama: "Mobil", tarif: 50000, upah: 30000 },
  motor_sendiri: { nama: "Motor Sendiri", tarif: 15000, upah: 3000 },
  mobil_sendiri: { nama: "Mobil Sendiri", tarif: 25000, upah: 3000 }
};

const namaBulan = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

let semuaData = [];
let sedangMemuat = false;
let halamanRiwayat = 1;
const barisPerHalaman = 8;

function rupiah(angka) {
  return "Rp " + Number(angka || 0).toLocaleString("id-ID");
}

function pad2(angka) {
  return String(angka).padStart(2, "0");
}

function tanggalLokalHariIni() {
  const sekarang = new Date();
  return `${sekarang.getFullYear()}-${pad2(sekarang.getMonth() + 1)}-${pad2(sekarang.getDate())}`;
}

function normalisasiTanggal(value) {
  if (!value) return null;

  if (value instanceof Date && !isNaN(value)) return value;

  const text = String(value).trim();

  // Input HTML date: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [y, m, d] = text.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  const parsed = new Date(text);
  return isNaN(parsed) ? null : parsed;
}

function dateKey(value) {
  const d = normalisasiTanggal(value);
  if (!d) return "";
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatTanggal(value) {
  const d = normalisasiTanggal(value);
  if (!d) return "-";
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getMingguKe(value) {
  const tanggal = normalisasiTanggal(value);
  if (!tanggal) return 0;

  const hari = tanggal.getDate();
  if (hari <= 7) return 1;
  if (hari <= 14) return 2;
  if (hari <= 21) return 3;
  return 4;
}

function dataTransaksi(item) {
  return String(item.jenisData || "").toUpperCase() === "TRANSAKSI";
}

function dataPengeluaran(item) {
  return String(item.jenisData || "").toUpperCase() === "PENGELUARAN";
}

function updateTarif() {
  const jenis = document.getElementById("layanan").value;

  if (!jenis || !layanan[jenis]) {
    document.getElementById("tarif").textContent = "Rp 0";
    document.getElementById("upah").textContent = "Rp 0";
    document.getElementById("pemilik").textContent = "Rp 0";
    return;
  }

  const data = layanan[jenis];
  document.getElementById("tarif").textContent = rupiah(data.tarif);
  document.getElementById("upah").textContent = rupiah(data.upah);
  document.getElementById("pemilik").textContent = rupiah(data.tarif - data.upah);
}

async function simpanTransaksi() {
  const jenis = document.getElementById("layanan").value;
  const tanggal = document.getElementById("tanggalTransaksi").value;

  if (!tanggal) return alert("Pilih tanggal transaksi");
  if (!jenis || !layanan[jenis]) return alert("Pilih kendaraan");

  const data = layanan[jenis];
  const btn = document.getElementById("btnTransaksi");

  const payload = {
    tanggal,
    jenisData: "TRANSAKSI",
    keterangan: data.nama,
    tarif: data.tarif,
    upahPegawai: data.upah,
    bagianPemilik: data.tarif - data.upah
  };

  try {
    setButtonLoading(btn, true, "Menyimpan...");

    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    alert("Transaksi berhasil disimpan");
    document.getElementById("layanan").value = "";
    updateTarif();
    await loadData();
  } catch (err) {
    console.error(err);
    alert("Gagal menyimpan transaksi. Periksa koneksi atau Google Apps Script.");
  } finally {
    setButtonLoading(btn, false, "Simpan Transaksi");
  }
}

async function simpanPengeluaran() {
  const tanggal = document.getElementById("tanggalPengeluaran").value;
  const keterangan = document.getElementById("keterangan").value.trim();
  const nominal = Number(document.getElementById("nominal").value);

  if (!tanggal) return alert("Pilih tanggal pengeluaran");
  if (!keterangan || !nominal || nominal <= 0) {
    return alert("Lengkapi data pengeluaran dengan nominal yang benar");
  }

  const btn = document.getElementById("btnPengeluaran");

  const payload = {
    tanggal,
    jenisData: "PENGELUARAN",
    keterangan,
    tarif: nominal,
    upahPegawai: 0,
    bagianPemilik: 0
  };

  try {
    setButtonLoading(btn, true, "Menyimpan...");

    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    alert("Pengeluaran berhasil disimpan");
    document.getElementById("keterangan").value = "";
    document.getElementById("nominal").value = "";
    await loadData();
  } catch (err) {
    console.error(err);
    alert("Gagal menyimpan pengeluaran. Periksa koneksi atau Google Apps Script.");
  } finally {
    setButtonLoading(btn, false, "Simpan Pengeluaran");
  }
}

function setButtonLoading(button, loading, text) {
  button.disabled = loading;
  button.textContent = text;
}

async function loadData() {
  if (sedangMemuat) return;

  const status = document.getElementById("statusData");
  sedangMemuat = true;
  status.textContent = "Memuat data...";
  status.classList.remove("error");

  try {
    const response = await fetch(`${SCRIPT_URL}?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    semuaData = Array.isArray(data) ? data : [];

    renderSemua();

    status.textContent = `Data berhasil dimuat • ${semuaData.length.toLocaleString("id-ID")} baris • ${new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`;
  } catch (err) {
    console.error(err);
    status.textContent = "Gagal memuat data dari Google Apps Script.";
    status.classList.add("error");
  } finally {
    sedangMemuat = false;
  }
}

function getFilter() {
  return {
    tanggal: document.getElementById("filterTanggal").value,
    bulan: Number(document.getElementById("filterBulan").value),
    minggu: Number(document.getElementById("filterMinggu").value)
  };
}

function cocokBulan(item, bulan) {
  const tanggal = normalisasiTanggal(item.tanggal);
  return tanggal && tanggal.getMonth() === bulan;
}

function cocokMinggu(item, bulan, minggu) {
  return cocokBulan(item, bulan) && getMingguKe(item.tanggal) === minggu;
}

function cocokHari(item, tanggalKey) {
  return dateKey(item.tanggal) === tanggalKey;
}

function renderSemua() {
  updateDashboard(semuaData);
  renderRekapKendaraan(semuaData);
  renderPengeluaran(semuaData);
  renderTable(semuaData);
}

function updateDashboard(data) {
  const { bulan, minggu } = getFilter();

  const weekLabel = document.getElementById("financeWeekLabel");
  const monthLabel = document.getElementById("financeMonthLabel");
  if (weekLabel) weekLabel.textContent = `${namaBulan[bulan]} • Minggu ${minggu}`;
  if (monthLabel) monthLabel.textContent = namaBulan[bulan];

  let omzetMinggu = 0;
  let keluarMinggu = 0;
  let pegawaiMinggu = 0;
  let pemilikMinggu = 0;

  let omzetBulan = 0;
  let keluarBulan = 0;
  let pegawaiBulan = 0;
  let pemilikBulan = 0;

  data.forEach(item => {
    if (!normalisasiTanggal(item.tanggal)) return;

    if (cocokBulan(item, bulan)) {
      if (dataTransaksi(item)) {
        omzetBulan += Number(item.tarif || 0);
        pegawaiBulan += Number(item.upahPegawai || 0);
        pemilikBulan += Number(item.bagianPemilik || 0);
      } else if (dataPengeluaran(item)) {
        keluarBulan += Number(item.tarif || 0);
      }
    }

    if (cocokMinggu(item, bulan, minggu)) {
      if (dataTransaksi(item)) {
        omzetMinggu += Number(item.tarif || 0);
        pegawaiMinggu += Number(item.upahPegawai || 0);
        pemilikMinggu += Number(item.bagianPemilik || 0);
      } else if (dataPengeluaran(item)) {
        keluarMinggu += Number(item.tarif || 0);
      }
    }
  });

  document.getElementById("omzetMinggu").textContent = rupiah(omzetMinggu);
  document.getElementById("pengeluaranMinggu").textContent = rupiah(keluarMinggu);
  document.getElementById("pegawaiMinggu").textContent = rupiah(pegawaiMinggu);
  document.getElementById("pemilikMinggu").textContent = rupiah(pemilikMinggu);
  document.getElementById("labaMinggu").textContent = rupiah(pemilikMinggu - keluarMinggu);

  document.getElementById("omzetBulan").textContent = rupiah(omzetBulan);
  document.getElementById("pengeluaranBulan").textContent = rupiah(keluarBulan);
  document.getElementById("pegawaiBulan").textContent = rupiah(pegawaiBulan);
  document.getElementById("pemilikBulan").textContent = rupiah(pemilikBulan);
  document.getElementById("labaBulan").textContent = rupiah(pemilikBulan - keluarBulan);
}

function renderRekapKendaraan(data) {
  const { tanggal, bulan, minggu } = getFilter();
  const transaksi = data.filter(dataTransaksi);

  const harian = transaksi.filter(item => cocokHari(item, tanggal));
  const mingguan = transaksi.filter(item => cocokMinggu(item, bulan, minggu));
  const bulanan = transaksi.filter(item => cocokBulan(item, bulan));

  document.getElementById("kendaraanHari").textContent = harian.length.toLocaleString("id-ID");
  document.getElementById("kendaraanMinggu").textContent = mingguan.length.toLocaleString("id-ID");
  document.getElementById("kendaraanBulan").textContent = bulanan.length.toLocaleString("id-ID");

  document.getElementById("labelHari").textContent = formatTanggal(tanggal);
  document.getElementById("labelMinggu").textContent = `${namaBulan[bulan]} • Minggu ${minggu}`;
  document.getElementById("labelBulan").textContent = namaBulan[bulan];

  const jenis = Object.values(layanan).map(item => item.nama);
  const tbody = document.getElementById("tabelRekapKendaraan");

  tbody.innerHTML = jenis.map(nama => {
    const hitungHari = harian.filter(item => String(item.keterangan || "").trim() === nama).length;
    const hitungMinggu = mingguan.filter(item => String(item.keterangan || "").trim() === nama).length;
    const hitungBulan = bulanan.filter(item => String(item.keterangan || "").trim() === nama).length;

    return `
      <tr>
        <td>${escapeHTML(nama)}</td>
        <td><strong>${hitungHari}</strong></td>
        <td><strong>${hitungMinggu}</strong></td>
        <td><strong>${hitungBulan}</strong></td>
      </tr>
    `;
  }).join("");
}

function renderPengeluaran(data) {
  const { tanggal, bulan, minggu } = getFilter();
  const pengeluaran = data.filter(dataPengeluaran);

  const totalHari = pengeluaran
    .filter(item => cocokHari(item, tanggal))
    .reduce((sum, item) => sum + Number(item.tarif || 0), 0);

  const totalMinggu = pengeluaran
    .filter(item => cocokMinggu(item, bulan, minggu))
    .reduce((sum, item) => sum + Number(item.tarif || 0), 0);

  const pengeluaranBulan = pengeluaran
    .filter(item => cocokBulan(item, bulan))
    .sort((a, b) => (normalisasiTanggal(b.tanggal)?.getTime() || 0) - (normalisasiTanggal(a.tanggal)?.getTime() || 0));

  const totalBulan = pengeluaranBulan
    .reduce((sum, item) => sum + Number(item.tarif || 0), 0);

  document.getElementById("pengeluaranHariRekap").textContent = rupiah(totalHari);
  document.getElementById("pengeluaranMingguRekap").textContent = rupiah(totalMinggu);
  document.getElementById("pengeluaranBulanRekap").textContent = rupiah(totalBulan);
  document.getElementById("labelPengeluaranBulan").textContent = `${namaBulan[bulan]} • ${pengeluaranBulan.length} catatan`;

  const tbody = document.getElementById("tabelPengeluaran");

  if (!pengeluaranBulan.length) {
    tbody.innerHTML = '<tr><td colspan="3" class="empty-cell">Belum ada pengeluaran pada bulan ini.</td></tr>';
    return;
  }

  tbody.innerHTML = pengeluaranBulan.map(item => `
    <tr>
      <td>${escapeHTML(formatTanggal(item.tanggal))}</td>
      <td>${escapeHTML(item.keterangan || "-")}</td>
      <td class="money-cell expense">${escapeHTML(rupiah(item.tarif))}</td>
    </tr>
  `).join("");
}

function renderTable(data) {
  const jenisFilter = document.getElementById("filterJenisData").value;
  const kataKunci = document.getElementById("cariData").value.trim().toLowerCase();

  const hasil = data
    .filter(item => {
      const jenis = String(item.jenisData || "").toUpperCase();
      const sesuaiJenis = jenisFilter === "SEMUA" || jenis === jenisFilter;
      const teks = `${item.keterangan || ""} ${jenis}`.toLowerCase();
      const sesuaiCari = !kataKunci || teks.includes(kataKunci);
      return sesuaiJenis && sesuaiCari;
    })
    .sort((a, b) => (normalisasiTanggal(b.tanggal)?.getTime() || 0) - (normalisasiTanggal(a.tanggal)?.getTime() || 0));

  const tbody = document.getElementById("tabelSemuaData");
  const footer = document.getElementById("jumlahBarisData");
  const infoHalaman = document.getElementById("infoHalaman");
  const btnPrev = document.getElementById("btnPrevPage");
  const btnNext = document.getElementById("btnNextPage");

  const totalHalaman = Math.max(1, Math.ceil(hasil.length / barisPerHalaman));
  if (halamanRiwayat > totalHalaman) halamanRiwayat = totalHalaman;
  if (halamanRiwayat < 1) halamanRiwayat = 1;

  const awal = (halamanRiwayat - 1) * barisPerHalaman;
  const dataHalaman = hasil.slice(awal, awal + barisPerHalaman);

  footer.textContent = hasil.length
    ? `${awal + 1}-${Math.min(awal + barisPerHalaman, hasil.length)} dari ${hasil.length.toLocaleString("id-ID")} data`
    : "0 data";
  infoHalaman.textContent = `Halaman ${halamanRiwayat} / ${totalHalaman}`;
  btnPrev.disabled = halamanRiwayat <= 1;
  btnNext.disabled = halamanRiwayat >= totalHalaman;

  if (!hasil.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">Tidak ada data yang sesuai.</td></tr>';
    return;
  }

  tbody.innerHTML = dataHalaman.map(item => {
    const transaksi = dataTransaksi(item);
    const jenisText = transaksi ? "TRANSAKSI" : (dataPengeluaran(item) ? "PENGELUARAN" : String(item.jenisData || "-"));
    const badgeClass = transaksi ? "badge-transaction" : "badge-expense";

    return `
      <tr>
        <td>${escapeHTML(formatTanggal(item.tanggal))}</td>
        <td><span class="badge ${badgeClass}">${escapeHTML(jenisText)}</span></td>
        <td>${escapeHTML(item.keterangan || "-")}</td>
      
      </tr>
    `;
  }).join("");
}

function sinkronkanFilterTanggal() {
  const tanggal = normalisasiTanggal(document.getElementById("filterTanggal").value);
  if (!tanggal) return;

  document.getElementById("filterBulan").value = tanggal.getMonth();
  document.getElementById("filterMinggu").value = getMingguKe(tanggal);
}

function pasangEvent() {
  document.getElementById("btnTransaksi").addEventListener("click", simpanTransaksi);
  document.getElementById("btnPengeluaran").addEventListener("click", simpanPengeluaran);
  document.getElementById("btnRefresh").addEventListener("click", loadData);

  document.getElementById("filterTanggal").addEventListener("change", () => {
    sinkronkanFilterTanggal();
    renderSemua();
  });

  document.getElementById("filterBulan").addEventListener("change", renderSemua);
  document.getElementById("filterMinggu").addEventListener("change", renderSemua);
  document.getElementById("filterJenisData").addEventListener("change", () => {
    halamanRiwayat = 1;
    renderTable(semuaData);
  });
  document.getElementById("cariData").addEventListener("input", () => {
    halamanRiwayat = 1;
    renderTable(semuaData);
  });
  document.getElementById("btnPrevPage").addEventListener("click", () => {
    if (halamanRiwayat > 1) {
      halamanRiwayat--;
      renderTable(semuaData);
    }
  });
  document.getElementById("btnNextPage").addEventListener("click", () => {
    halamanRiwayat++;
    renderTable(semuaData);
  });
}

function init() {
  const hariIni = tanggalLokalHariIni();
  const sekarang = normalisasiTanggal(hariIni);

  document.getElementById("tanggalTransaksi").value = hariIni;
  document.getElementById("tanggalPengeluaran").value = hariIni;
  document.getElementById("filterTanggal").value = hariIni;
  document.getElementById("filterBulan").value = sekarang.getMonth();
  document.getElementById("filterMinggu").value = getMingguKe(sekarang);

  pasangEvent();
  loadData();
  setInterval(loadData, 30000);
}

document.addEventListener("DOMContentLoaded", init);
