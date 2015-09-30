"use strict";

let begin = Date.now();

const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const request = require('sync-request');
const cheerio = require('cheerio');
const Entities = require('html-entities').XmlEntities;
const _ = require('lodash');
const configs = require('./configs');
const personalInfo = require('./personal-info');

const site = 'http://www.zhihu.com';
const entities = new Entities();

let total = 0;

if (!fs.existsSync('./pics')) {
  mkdirp('./pics', function (err) {
    if (err) {
      console.log(err);
    } else {
      console.log('Make ./pics directory.')
    }
  })
}

let questions = configs.questions;
let answers = configs.answers;
let collections = configs.collections;
let questionsInAnswers = configs.questionsInAnswers;
let collectionsInAnswers = configs.collectionsInAnswers;

questions.forEach(id => {
  requestImagesInQuestion(id);
});

function sendRequest(url, cb) {
  let res = request('GET', url, {
    headers: personalInfo.headers
  });
  if (res.statusCode > 300) {
    cb(res.body.toString());
  } else {
    cb(null, res.body.toString())
  }
}

function requestImagesInQuestion(id) {
  sendRequest(`${site}/question/${id}`, (err, result) => {
    if (err) {
      console.log(err);
      console.log('Load question fail.');
    } else {
      let $ = cheerio.load(result);
      let questionTitle = entities.decode($('#zh-question-title h2').html()).replace(/^<a*a>$/g, '').replace(/\n/g, '').replace(/\r/g, '').replace(/\//g, '-');
      batchLoadImagesInAnswers($, questionTitle, $('.zm-item-answer'));
    }
  });
}

function batchLoadImagesInAnswers($, questionTitle, answers) {
  if (!fs.existsSync(`./pics/${questionTitle}`)) {
    fs.mkdirSync(`./pics/${questionTitle}`);
    console.log(`Directory made: ${questionTitle}`);
  }
  answers.each((i, e) => {
    loadPicturesInAnswer($, e, questionTitle);
  });
}

function loadPicturesInAnswer($, answer, title) {
  let aid = $(answer).attr('data-aid');
  let username = entities.decode($(answer).find('.zm-item-answer-author-wrap a').not('.zm-item-link-avatar').html() || '其它');
  let imgs = $(answer).find('img').not('.zm-list-avatar');
  console.log(`Question - ${title}, answer - ${aid}`);
  imgs.each((i, e)=> {
    let src = $(e).attr('src') || $(e).attr('data-actualsrc');
    if (src.indexOf('http') >= 0) {
      let filename = `./pics/${title}/${username}-${aid}-${_.last(src.split('/'))}`;
      total++;
      console.log(`Total: ${total}`);
      if (!fs.existsSync(filename)) {
        console.log(`Filename - ${filename}`);
        let res = request('GET', src, {
          headers: personalInfo.headers
        });
        if (res.statusCode > 300) {
          console.log('Load picture fail.');
        } else {
          let body = res.body;
          if (body.length >= 100000) {
            fs.writeFileSync(filename, body, 'binary');
            console.log(`File saved: ${filename}`);
          }
        }
      }
    }
  });
}

answers.forEach(answer => {
  requestImagesInAnswer(answer);
});

function requestImagesInAnswer(answer) {
  sendRequest(`${site}/question/${answer.qid}/answer/${answer.aid}`, (err, result) => {
    if (err) {
      console.log(err);
      console.log('Load answer fail.');
      throw err;
    } else {
      let $ = cheerio.load(result);
      let questionTitle = entities.decode($('#zh-question-title h2 a').html()).replace(/\n/g, '').replace(/\r/g, '').replace('/', '-');
      batchLoadImagesInAnswers($, questionTitle, $('#zh-question-answer-wrap .zm-item-answer'));
    }
  });
}

collections.forEach(id => {
  requestImagesInCollection(id);
});

function requestImagesInCollection(id) {
  console.log(`Collection - ${id}`);
  sendRequest(`${site}/collection/${id}`, (err, result) => {
    if (err) {
      console.log(err);
      console.log('Load collection fail.');
      throw err;
    } else {
      let $ = cheerio.load(result);
      let pageNums = $('.zm-invite-pager span');
      let pageTotal = parseInt($(pageNums[pageNums.length - 2]).find('a').html());
      for (let i = 1; i <= pageTotal; i++) {
        requestImagesInCollectionByPage(id, i);
      }
    }
  });
}

function requestImagesInCollectionByPage(id, pageNum) {
  console.log(`Collection - ${id}, page - ${pageNum}`);
  sendRequest(`${site}/collection/${id}?page=${pageNum}`, (err, result) => {
    if (err) {
      console.log(err);
      console.log('Load collection fail.');
    } else {
      let $ = cheerio.load(result);
      let answers = $('#zh-list-answer-wrap .zm-item');
      let questionTitle;
      answers.each((i, e) => {
        questionTitle = entities.decode($(e).find('.zm-item-title a').html() || questionTitle).replace(/\n/g, '').replace(/\r/g, '').replace('/', '-');
        let hidden = $(e).find('.zm-item-fav .zm-item-answer textarea.content.hidden').html();
        let realContent = cheerio.load(entities.decode(hidden));
        let aid = $(e).find('.zm-item-fav .zm-item-answer').attr('data-aid');
        let username = entities.decode($(e).find('.zm-item-fav h3.zm-item-answer-author-wrap a').html() || '其它');
        loadPicturesInCollection($, realContent('img'), questionTitle, aid, username);
      });
    }
  });
}

function loadPicturesInCollection($, imgs, title, aid, username) {
  console.log(`Question - ${title}, answer - ${aid}`);
  if (!fs.existsSync(`./pics/${title}`)) {
    fs.mkdirSync(`./pics/${title}`);
    console.log(`Directory made: ${title}`);
  }
  imgs.each((i, e)=> {
    let src = $(e).attr('src') || $(e).attr('data-actualsrc');
    if (src.indexOf('http') >= 0) {
      let filename = `./pics/${title}/${username}-${aid}-${_.last(src.split('/'))}`;
      total++;
      console.log(`Total: ${total}`);
      if (!fs.existsSync(filename)) {
        console.log(`Filename - ${filename}`);
        let res = request('GET', src, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/45.0.2454.99 Safari/537.36',
            'Cookie': '_za=7d63d8e9-7396-4595-8331-bae377889cb5; _ga=GA1.2.332379064.1411983169; _xsrf=dcffe3bb863bf919495c93651bf5da74; q_c1=23cae074075346cfb698b4a5a094aaa9|1441623822000|1412066247000; cap_id="YTk0ODA3N2U0N2E0NDk1ODhkMTY2YzAyNTE5YjUxOWE=|1443518718|4f8d8e1c7159cd3f0d462be4b853898df6d784fd"; z_c0="QUFEQXhkTVpBQUFYQUFBQVlRSlZUZkhuTVZZMEhsSGVTdmNhazJRY3MzbnM2dXBVNk1XOWRRPT0=|1443519217|697551448b74ebff26dde298884b9ed8c03e831a"; __utmt=1; __utma=51854390.332379064.1411983169.1443573920.1443598056.3; __utmb=51854390.4.10.1443598056; __utmc=51854390; __utmz=51854390.1443519472.1.1.utmcsr=zhihu.com|utmccn=(referral)|utmcmd=referral|utmcct=/collection/46627456; __utmv=51854390.100-1|2=registration_date=20121030=1^3=entry_date=20121030=1'
          }
        });
        if (res.statusCode > 300) {
          console.log('Load picture fail.');
        } else {
          let body = res.body;
          if (body.length >= 100000) {
            fs.writeFileSync(filename, body, 'binary');
            console.log(`File saved: ${filename}`);
          }
        }
      }
    }
  });
}

questionsInAnswers.forEach(answer => {
  sendRequest(`${site}/question/${answer.qid}/answer/${answer.aid}`, (err, result) => {
    if (err) {
      console.log(err);
      console.log('Load answer fail.');
      throw err;
    } else {
      let $ = cheerio.load(result);
      let links = $('.zm-item-rich-text a.internal');
      links.each((i, e) => {
        let href = $(e).attr('href');
        if (href.indexOf('question') >= 0) {
          requestImagesInQuestion(_.last(href.split('/')).split('#')[0].split('?')[0]);
        }
      });
    }
  });
});

collectionsInAnswers.forEach(answer => {
  console.log(`Question - ${answer.qid}, answer - ${answer.aid}`);
  sendRequest(`${site}/question/${answer.qid}/answer/${answer.aid}`, (err, result) => {
    if (err) {
      console.log(err);
      console.log('Load answer fail.');
      throw err;
    } else {
      let $ = cheerio.load(result);
      let links = $('.zm-item-rich-text a.internal');
      links.each((i, e) => {
        let href = $(e).attr('href');
        if (href.indexOf('collection') >= 0) {
          requestImagesInCollection(_.last(href.split('/')).split('#')[0].split('?')[0]);
        }
      });
    }
  });
});

let end = Date.now();

console.log(`\n\n\nTime cost: ${end - begin}\n\n\n`);




