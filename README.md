# zhihu-spiderman
爬取知乎上爆照问题下的图片，你懂的。

## 使用方法

### 先安装node包
`npm install`

### 在根目录下配置发送请求时的User-Agent和Cookie
知乎有防爬虫机制，所以需要将User-Agent设为浏览器，又因为未登录用户只能查看某一问题下的最多20条答案，因此需要先在浏览器登录，获取Cookies。
文件名为`personal-info.js`
```
module.exports = {
  "headers": {
    'User-Agent': 'xxx',
    'Cookie': 'xxx'
  }
};
```
### 配置各个问题、收藏等的id
`configs.js`里面是该配置的范例。

### 运行程序
`npm start`
