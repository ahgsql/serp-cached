const moment = require("moment");
var fs = require("fs");

const gunlukKlasor = () => {
  let bugun = moment().format("DD.MM.YYYY");
  let acilacakKlasor = "cache/" + bugun;
  if (!fs.existsSync(acilacakKlasor)) {
    fs.mkdirSync(acilacakKlasor);
  }
  return acilacakKlasor + "/";
};
const bekle = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
const dosyaGecenZaman = (file) => {
  const { ctime } = fs.statSync(file);
  let duzelt = moment(ctime);
  let suan = moment();

  return {
    saniye: suan.diff(duzelt, "seconds"),
    dakika: suan.diff(duzelt, "minutes"),
  };
};

const JSONyaz = (path, array) => {
  try {
    fs.writeFileSync(path, JSON.stringify(array));
    return true;
  } catch (error) {
    console.log(error);
  }
};
const JSONoku = (path, array) => {
  try {
    let rawdata = fs.readFileSync(path);
    return JSON.parse(rawdata);
  } catch (error) {
    return false;
  }
};
const selectors = {
  beklenecek: "div#results-stats",
  tekilsonuc: "div.rc",
  ilka: "div a",
  aciklama: "span.aCOpRe",
};
module.exports = {
  gunlukKlasor,
  dosyaGecenZaman,
  JSONoku,
  JSONyaz,
  bekle,
  selectors,
};
