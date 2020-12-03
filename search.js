const express = require("express"),
  app = express(),
  puppeteer = require("puppeteer"),
  fs = require("fs");
chalk = require("chalk");

const log = console.log;
const araclar = require("./fonks");
const onbellekSuresi = 90; //dakika
const port = 5555;
let browser = null;

const browser_ac = async () => {
  browser = await puppeteer.launch({
    args: ["--no-sandbox", "--hide-scrollbars", "--no-zygote"],
    headless: true,
  });
  log(`${chalk.green("Tarayıcı Başlatıldı")}`);
  browser.on("disconnected", browser_ac);
};

(async () => {
  await browser_ac();
})();

app.use(express.json());
//Api AraYüzü
app.get("/ara/:ara/:sayfa", async (req, res) => {
  //Zaman hesaplaması
  var t0 = new Date().getTime();

  try {
    //Yeni Tab aç ve özellikleri belirt.
    let page = await browser.newPage();
    await page.setViewport({
      width: 1280,
      height: 720,
    });
    //Keywordu al ve url hazırla.
    let ara = req.params.ara;
    let url = encodeURIComponent(ara).replace(/%20/g, "+");

    log(`Yeni Emir: ${chalk.blue(ara)}`);

    //Sonuçları Alan Fonksiyonlar Silsilesi
    let sonuclar = await aramaSonuclari(page, url, req.params.sayfa);
    //açılan sayfa kapansın
    await page.close();
    //geçen süre hesabı
    var t1 = new Date().getTime();
    let islemSuresi = (t1 - t0) / 1000;
    //Cevap hazırlanıyor.
    let cevap = {
      url,
      status: "ok",
      sonuclar,
      islemSuresi,
    };
    //cevap json olarak veriliyor.
    log(`Emir Tamamlanma: ${chalk.green(islemSuresi)} saniye.`);
    res.json(cevap);
  } catch (error) {
    console.log(error);
  }
});
//404 sayfası
app.get("*", function (req, res) {
  res.status(404).send("Hata");
});
//Express başlatıcı
app.listen(port, "0.0.0.0", function () {
  console.log("Uygulama çalışıyor.Port: " + port);
});

//aşağı kadar kaydırma
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve, reject) => {
      var totalHeight = 0;
      var distance = 300;
      var timer = setInterval(() => {
        var scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}
//tek divi parçalarına ayıran
async function tekilSonuc(element, page) {
  //tekil elementteki ilk div a $ ilk sonucu verir, $$ olsaydı array verirdi.
  let firsta = await element.$("div a");
  //evaluate ederek hrefini aldık.
  let link = await page.evaluate(
    (firsta) => firsta.getAttribute("href"),
    firsta
  );
  let h3 = await firsta.$("h3");
  let baslik = await page.evaluate((h3) => h3.textContent, h3);
  let ikinciDiv = await element.$("span.aCOpRe");
  let aciklama = await page.evaluate(
    (ikinciDiv) => ikinciDiv.textContent,
    ikinciDiv
  );
  return {
    baslik,
    link,
    aciklama,
  };
}

// Verilen URL'ye gider, tüm linkleri çözümler, liste döner.
async function sayfaSonucları(page, url) {
  try {
    await page.goto(url);
    await page.waitForSelector("div#result-stats", { timeout: 2000 });
    await page.waitForTimeout(10);
    let links = await page.$$(araclar.selectors.tekilsonuc);
    const result = await Promise.all(
      links.map((element) => tekilSonuc(element, page))
    );
    return result;
  } catch (error) {
    return [];
  }
}
//Genel İşçi, verilen sayfa sayısı kadar sayfalara giderek toplu sonuç verir.Sıralamayı yapar.
async function aramaSonuclari(page, url, pageCount) {
  //CACHE CONTROL
  let onBellekKlasoru = araclar.gunlukKlasor();
  //ASIL İŞLER
  let sonuclar = [];
  for (let start = 0; start < pageCount; start++) {
    let query = url + "&start=" + (start * 10).toString();
    let onBellekDosyaAdi = query;
    let onBellekPath = onBellekKlasoru + onBellekDosyaAdi + ".json";

    if (
      fs.existsSync(onBellekPath) &&
      araclar.dosyaGecenZaman(onBellekPath).dakika < onbellekSuresi
    ) {
      log(
        ` ${chalk.green(
          "Önbellekte Bulundu. " +
            chalk.bold.red(araclar.dosyaGecenZaman(onBellekPath).dakika) +
            " dk önce.  " +
            query
        )}`
      );
      let bellekten = araclar.JSONoku(onBellekPath);
      sonuclar = sonuclar.concat(bellekten);
    } else {
      let gidilecek = "https://www.google.com/search?q=" + query;
      let result = await sayfaSonucları(page, gidilecek);
      log(` ${chalk.yellow("Gidilen Sayfa: " + chalk.bold.red(start + 1))}`);
      araclar.JSONyaz(onBellekPath, result);

      log(
        ` ${chalk.green(
          "Önbelleğe kaydedildi. " + chalk.bold.red(onBellekPath)
        )}`
      );
      sonuclar = sonuclar.concat(result);
    }
  }
  //Sonuçlar düzenlenip sıra ekleniyor.
  let sira = 1;
  sonuclar.forEach((element) => {
    element.sira = sira;
    sira++;
  });
  // sonuçları dön
  return sonuclar;
}
