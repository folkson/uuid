/*
 * by netnr
 * 
 * https://github.com/netnr
 */

(function (window) {

    var uuid = function (ops) {
        return new uuid.fn.init(ops);
    }

    uuid.fn = uuid.prototype = {
        //初始化
        init: function (ops) {
            ops = ops || {};
            //容器
            this.id = ops.id || document.querySelector(".uuidbox");
            this.gitBranch = "master";
            //token
            this.token = localStorage.getItem("uuid-token-github");

            //缓存
            this.dataCache = {};

            var lpn = location.pathname;

            switch (lpn) {
                //fork
                case "/_fork":
                    this.nr = uuid.defaultRepos;
                    this.forkList();
                    break;
                //token
                case "/_token":
                    this.tokens();
                    break;
                default:
                    var pns = lpn.split('/');
                    //账号
                    this.name = uuid.setDv(ops.name || pns[1], 'netnr');
                    //仓库
                    this.repos = uuid.setDv(ops.repos || pns[2], 'uuid');
                    //包
                    this.libs = uuid.setDv(ops.libs || pns[3], 'libs');

                    this.nr = this.name + "/" + this.repos;

                    this.info();
            }

            this.jump();

            return this;
        },
        //获取用户
        getUser: function (callback, error) {
            var src = "https://api.github.com/users/" + this.name;
            uuid.fetch(this, src, callback, "text", error);
        },
        //获取仓库
        getRepos: function (callback) {
            var that = this;
            var src = "https://api.github.com/repos" + uuid.defaultRepos;
            var cacheRepos = uuid.cacheGet(that.name, src);
            uuid.fetch(this, src, function (data) {
                //仓库未更新
                var nochange = cacheRepos.ok && cacheRepos.value.updated_at == data.updated_at;
                var udata = localStorage.getItem("uuid_" + that.name);
                if (udata && udata != "") {
                    var ujson = JSON.parse(udata);
                    for (var i in ujson) {
                        if (i.indexOf("__create__") == 0) {
                            if (i.indexOf("/contents/") >= 0 || i.indexOf(`/git/trees/${uuid.gitBranch}?recursive=1`) >= 0) {
                                //未更新，延长缓存过期；已更新，设置超出缓存时间
                                ujson[i] = nochange ? new Date().valueOf() : 946656000000;
                            }
                        }
                    }
                    localStorage.setItem("uuid_" + that.name, JSON.stringify(ujson));
                }

                if (nochange) {
                    var udata = localStorage.getItem("uuid_" + that.name);
                    if (udata && udata != "") {
                        var ujson = JSON.parse(udata);
                        for (var i in ujson) {
                            if (i.indexOf("__create__") == 0) {
                                if (i.indexOf("/contents/") >= 0 || i.indexOf(`/git/trees/${uuid.gitBranch}?recursive=1`) >= 0) {
                                    ujson[i] = new Date().valueOf();
                                }
                            }
                        }
                        localStorage.setItem("uuid_" + that.name, JSON.stringify(ujson));
                    }
                }
                callback(data);
            }, 'json', function () {
                that.showMessage("Not found");
            })
        },
        //获取目录
        getDir: function (callback) {
            var that = this;
            var src = "https://api.github.com/repos/" + this.nr + "/contents/" + this.libs;
            uuid.fetch(this, src, callback, 'json', function () {
                that.showMessage("Not found");
            })
        },
        //获取分支
        getFork: function (callback) {
            var that = this;
            var src = "https://api.github.com/repos" + uuid.defaultRepos + "/forks";
            uuid.fetch(this, src, callback, 'json', function () {
                that.showMessage("Not found");
            })
        },
        //显示fork列表
        forkList: function () {
            var that = this;
            document.title = "fork - uuid";
            this.getFork(function (data) {

                if (data.length) {
                    that.id.innerHTML = '<h2 class="text-center mt-3">Fork</h2><hr/><div class="row nr-fork"></div>';
                }

                data.forEach(function (item) {
                    var icon = item.owner.avatar_url;
                    var name = item.owner.login;

                    var cf = document.createElement("div");
                    cf.className = "col-auto text-center mb-3";
                    cf.innerHTML = '<a href="' + location.origin + '/' + name + '"><img data-src="' + icon + '" src="' + uuid.defaultFavicon + '" /><br/>' + name + '</a>';
                    that.id.querySelector('.nr-fork').appendChild(cf);

                    var cfimg = cf.getElementsByTagName('img')[0];
                    var img = new Image();
                    img.src = cfimg.getAttribute('data-src');
                    img.onload = function () { cfimg.src = this.src }
                })

                if (data.length) {
                    var morefork = "https://github.com" + that.nr + "/network/members";
                    var cf = document.createElement("div");
                    cf.className = "col-auto text-center mb-3";
                    cf.innerHTML = '<a href="' + morefork + '"><img src="/favicon.ico" /><br/>More fork</a>';
                    that.id.querySelector('.nr-fork').appendChild(cf);

                    that.showCacheInfo();
                } else {
                    that.showMessage('No fork')
                }
            })
        },
        //个人信息
        info: function () {
            var that = this;

            var ind = document.createElement("div");
            ind.className = "row mt-3 mb-3";
            ind.innerHTML = `
                    <div class="col-auto mb-2">
                        <img class="uphoto" src="/favicon.ico" onerror="this.src=\'/favicon.ico\';this.onerror=null;" />
                    </div>
                    <div class="col-auto mb-2 nr-meinfo">
                    </div>
                    <div class="col-md-auto mb-2"><select class="form-select form-select-lg nrGroup"><option value="">All</option></select></div>
                    <div class="col-md-auto mb-2"><input class="form-control form-control-lg nr-txtSearch" placeholder="搜索，支持静默搜索"/></div>                    
                    <div class="col-auto">
                        <a href="/convertbookmarks.html" class="mb-2 btn btn-lg btn-primary" title="转换浏览器导出的书签（HTML）">Convert</a>
                        <a href="/_token" class="mb-2 btn btn-lg btn-${(that.token ? "success" : "secondary")}" title="${that.token ? '已设置token' : '未设置token，访问速率受限制'}">Token</a>
                        <a href="/_fork" class="mb-2 btn btn-lg btn-dark nr-btn-fork">Fork</a>
                    </div>
                `;

            var cardbox = document.createElement("div");
            cardbox.className = "row nr-card";

            this.id.appendChild(ind);
            this.id.appendChild(cardbox);

            that.search();

            this.getUser(function (data) {
                data = JSON.parse(data);
                if (!data.login) {
                    return;
                }

                document.title = `${data.login} - uuid`;

                var nhref = "https://github.com/";

                var blog = data.blog, bloghtml;
                if (blog) {
                    blog = blog.indexOf('//') > 0 ? blog : ('http://' + blog);
                    bloghtml = '<a class="small" href="' + blog + '">' + data.blog + '</a>';
                } else {
                    bloghtml = '<a class="small text-muted">no blog</a>';
                }

                //头像、名称、链接
                ind.querySelector('.uphoto').src = data.avatar_url;
                ind.querySelector('.nr-meinfo').innerHTML = `
                <div><a class="text-muted h5" href="${nhref + data.login}">${data.login}</a></div>
                <div>${bloghtml}</div>
                `;

                //fork按钮
                that.getRepos(function (data) {
                    ind.querySelector('.nr-btn-fork').innerHTML = 'Fork &nbsp;' + data.forks_count;
                })

                that.build();
            }, function () {
                uu.showMessage('获取用户信息失败（请<a target="_self" href="javascript:location.reload(false)">刷新</a>重试）');
            })
        },
        //搜索
        search: function () {
            var that = this;

            var sh = document.querySelector('.nr-txtSearch');

            sh.oninput = function () {
                var key = this.value.toLowerCase();
                var cb = that.id.querySelector('.nr-card').children;
                for (var i = 0; i < cb.length; i++) {
                    var anode = cb[i].children, hasa = 0;
                    for (var j = 1; j < anode.length; j++) {
                        var anj = anode[j];
                        if (anj.href.toLowerCase().indexOf(key) >= 0 || anj.innerHTML.toLowerCase().indexOf(key) >= 0) {
                            anj.style.display = "";
                            hasa = 1;
                        } else {
                            anj.style.display = "none";
                        }
                    }
                    cb[i].style.display = hasa ? "" : "none";
                }
            }
            sh.title = "静默搜索，支持快捷方式：Esc、↑、↓、Enter，可直达网址";

            //分类选择
            document.querySelector('.nrGroup').onchange = function () {
                var cards = document.querySelector('.nr-card').children;
                for (var i = 0; i < cards.length; i++) {
                    var ci = cards[i];
                    if (this.value == "" || ci.firstChild.innerHTML.indexOf(this.value) >= 0) {
                        ci.classList.remove('d-none');
                    } else {
                        ci.classList.add('d-none');
                    }
                }
            }
        },
        //跳转
        jump: function () {
            var that = this;
            //静默搜索
            that.dataCache.jumpkey = that.dataCache.jumpkey || "";

            window.addEventListener('keypress', function (e) {
                if (document.activeElement.nodeName != "INPUT") {
                    if (that.dataCache.jumpkey.length < 28) {
                        that.dataCache.jumpkey += String.fromCharCode(e.keyCode);
                    }
                    that.jumpView();
                }
            });
            window.addEventListener('keydown', function (e) {
                if (document.activeElement.nodeName != "INPUT") {
                    switch (e.keyCode) {
                        //退格
                        case 8:
                            if (that.dataCache.jumpkey != "") {
                                that.dataCache.jumpkey = that.dataCache.jumpkey.substring(0, that.dataCache.jumpkey.length - 1);
                            }
                            that.jumpView();
                            uuid.stopDefault(e);
                            break;
                        //回车
                        case 13:
                            var openuri = that.jumpnode.firstChild.innerText;
                            var ali = that.jumpnode.getElementsByClassName('active')[0];
                            if (ali) {
                                openuri = ali.firstChild.innerText.trim();
                            }
                            if (openuri.indexOf('.') == -1) {
                                var dq = that.dataCache.config.searchapi || uuid.defaultSearch;
                                openuri = dq + encodeURIComponent(openuri);
                            } else if (openuri.toLowerCase().indexOf("http") != 0) {
                                openuri = "http://" + openuri;
                            }
                            that.dataCache.jumpkey = "";
                            that.jumpView();
                            uuid.stopDefault(e);
                            window.open(openuri.trim());
                            break;
                        //ESC
                        case 27:
                            that.dataCache.jumpkey = "";
                            that.jumpView();
                            uuid.stopDefault(e);
                            break;
                        //up
                        case 38:
                        //down
                        case 40:
                            if (that.jumpnode) {
                                var ali = that.jumpnode.getElementsByClassName('active')[0];
                                if (ali) {
                                    var newli;
                                    e.keyCode == 38 && (newli = ali.previousSibling);
                                    e.keyCode == 40 && (newli = ali.nextSibling);
                                    if (newli) {
                                        newli.className = "active";
                                        ali.className = "";
                                    }
                                    uuid.stopDefault(e);
                                }
                            }
                            break;
                    }
                }
            })
        },
        //跳转显示
        jumpView: function () {
            var that = this;
            if (!that.jumpnode) {
                var jv = document.createElement('div');
                jv.className = "uuidjump";
                document.body.appendChild(jv);
                jv.onclick = function (e) {
                    var target = e.target;
                    var lis = this.getElementsByTagName('li');
                    for (var j = 0; j < lis.length; j++) {
                        if (lis[j].contains(target)) {
                            window.open(lis[j].firstChild.innerText.trim());
                            that.dataCache.jumpkey = "";
                            that.jumpView();
                            break;
                        }
                    }
                }
                jv.autopost = function () {
                    jv.style.left = (document.documentElement.clientWidth / 2 - jv.clientWidth / 2) + "px";
                };
                jv.autopost();
                window.addEventListener('resize', jv.autopost);
                that.jumpnode = jv;
            }
            if (that.dataCache.jumpkey.trim() != "") {
                that.jumpnode.style.display = "";
                var htm = [], cn = 0;
                for (var i = 0; i < document.links.length; i++) {
                    if (cn > 6) {
                        break;
                    }
                    var link = document.links[i];
                    if (link.href.toLowerCase().indexOf(that.dataCache.jumpkey.toLowerCase()) >= 0 || link.innerText.toLowerCase().indexOf(that.dataCache.jumpkey.toLowerCase()) >= 0) {
                        cn++;
                        if (htm.length) {
                            htm.push('<li>')
                        } else {
                            htm.push('<li class="active">')
                        }
                        htm.push('<div class="text-info">' + link.href + '</div>')
                        htm.push('<div>' + link.innerText + '</div>')
                        htm.push('</li>')
                    }
                }
                var jnhtml = '<div class="h3 pt-2 px-3">' + that.dataCache.jumpkey + '</div>';
                if (htm.length) {
                    jnhtml = jnhtml + "<ul>" + htm.join('') + "</ul>";
                }
                that.jumpnode.innerHTML = jnhtml;
                that.jumpnode.autopost();
            } else {
                that.jumpnode.style.display = "none";
                that.jumpnode.innerHTML = "";
            }
        },
        se: function (s) {
            return s.replace(/"/g, "&quot;").replace(/'/g, "");
        },
        //构建
        build: function () {
            var that = this;
            that.getDir(function (data) {
                //缓存
                that.dataCache.dir = data;

                var hasfile = false;
                //遍历目录
                data.forEach(function (item) {
                    //是配置文件                    
                    if (item.path == that.libs + "/" + uuid.defaultConfig) {
                        that.configUrl = item.url;
                    } else {
                        //是文件
                        var isfile = item.type == "file";

                        if (isfile) {
                            hasfile = true;

                            //card 标题，标题链接,文件链接
                            var type = item.name.substr(0, item.name.lastIndexOf('.'));
                            var typelink = item.html_url;
                            var filesrc = item.url;

                            //创建卡片
                            var card = document.createElement("div");
                            card.className = "col-12 mb-3";
                            card.innerHTML = `<a class="text-success bg-light mb-2 me-2" href="${typelink}" >${type}</a>
                            <div class="spinner-border ms-1" role="status"><span class="visually-hidden">Loading...</span></div>`;

                            //显示卡片
                            that.id.querySelector('.nr-card').appendChild(card);
                            //卡片追加到选择框
                            var seg = document.querySelector('.nrGroup');

                            seg.add(new Option(type));

                            //加载卡片下的链接，一个卡片对应一个文件
                            uuid.fetch(that, filesrc, function (data) {
                                data = decodeURIComponent(escape(atob(data.content)));

                                var list = data.split('\n');
                                var ahtm = [];
                                //遍历每一行，解析成A标签
                                list.forEach(function (line) {
                                    //满足Markdown的链接格式，有效行
                                    if (/\[.*?\]\(http.*?\)/.test(line)) {
                                        //A标签显示的文本、图标、链接
                                        var atext, ahref;
                                        line.replace(/\(http.*?\)/, function (x) {
                                            if (/\(http.*?\ /.test(x)) {
                                                line.replace(/\(http.*?\ /, function (y) {
                                                    ahref = y.substring(1).trim();
                                                })
                                            } else {
                                                ahref = x.substring(1, x.length - 1).trim();
                                            }
                                        })
                                        line.replace(/\[.*?\]/, function (x) {
                                            atext = x.substring(1, x.length - 1).trim();
                                        })
                                        atext.replace(/ http.*/, function (x) {
                                            atext = atext.replace(x, "");
                                        })

                                        ahtm.push('<a class="mb-2 me-2" href="' + ahref + '" title="' + that.se(atext) + '">' + atext + '</a>');
                                    }
                                })
                                card.querySelector('.spinner-border').remove();
                                card.innerHTML += ahtm.join('');

                                //链接数
                                var itemtotal = document.createElement("span");
                                itemtotal.className = "ms-2";
                                itemtotal.innerHTML = "(" + ahtm.length + ")";
                                card.querySelector('a').appendChild(itemtotal);

                            }, 'json');
                        }
                    }
                });
                //为空时
                if (!hasfile) {
                    that.showMessage("Is empty");
                }

                that.showCacheInfo();

                //载入配置
                if (that.configUrl) {
                    uuid.fetch(that, that.configUrl, function (data) {
                        that.dataCache.config = data = JSON.parse(decodeURIComponent(escape(atob(data.content))));
                    }, 'json')
                }
            })
        },
        //设置token
        tokens: function () {
            document.title = "token - uuid";
            var dr = document.createElement("div");
            dr.style.cssText = "max-width:600px;margin:5% auto";
            var htm = [
                '<h4>Personal access tokens（令牌）</h4>',
                '粘贴后，刷新你的 uuid</br>',
                '匿名访问有速率限制（GitHub 每小时 60 次）</br>',
                '如果超出限制会返回 <code>403</code> 错误 </br>',
                '<input class="form-control form-control-lg my-3 nr-token-github" placeholder="GitHub Token">',
                '链接：<a href="https://github.com/settings/tokens">https://github.com/settings/tokens</a>'
            ];

            dr.innerHTML = htm.join('');

            dr.querySelectorAll('input').forEach(inp => {
                inp.oninput = function () {
                    if (this.value.length > 30) {
                        localStorage.setItem("uuid-token-github", this.value);
                    } else {
                        localStorage.removeItem("uuid-token-github");
                    }
                }
            });

            dr.querySelector('.nr-token-github').value = localStorage.getItem("uuid-token-github") || "";

            this.id.appendChild(dr);
        },
        //显示消息
        showMessage: function (msg) {
            var h2 = document.createElement('h2');
            h2.className = "text-danger text-center my-5";
            h2.innerHTML = msg;
            this.id.appendChild(h2)
        },
        //显示缓存信息
        showCacheInfo: function () {
            var cp = document.createElement("p");
            cp.className = "small";
            cp.style.clear = "both";
            cp.style.opacity = .7;
            if (this.iscache) {
                cp.innerHTML = '当前信息从本地读取，<span class="text-primary" style="cursor:pointer" onclick="uu.cacheClear()">刷新</span>';
            }
            this.id.appendChild(cp);
        },
        //清除当前用户的本地存储
        cacheClear: function () {
            uuid.cacheClear(this.name);
        }
    }

    uuid.fn.init.prototype = uuid.fn;

    //默认的图标
    uuid.defaultFavicon = "/favicon.ico";
    //默认源仓库
    uuid.defaultRepos = "/netnr/uuid";
    //默认配置文件
    uuid.defaultConfig = "config.json";
    //默认搜索
    uuid.defaultSearch = "https://www.google.com/search?q=";

    /**
     * 赋值默认值
     * @param {any} val 值
     * @param {any} dv 默认值
     */
    uuid.setDv = function (val, dv) {
        if (!val || val == "" || val == "index.html") {
            val = dv;
        }
        return val;
    }

    /**
     * 获取JSON的值
     * @param {any} data 数据源
     * @param {any} keyPath 键路径
     */
    uuid.getJSONValue = function (data, keyPath) {
        var kps = keyPath.split(':'), di = 0, val;
        while (di < kps.length && data && typeof data == "object") {
            val = (val || data)[kps[di++]];
        }
        return val;
    }

    /**
     * 阻止默认行为
     * @param {any} e
     */
    uuid.stopDefault = function (e) {
        if (e && e.preventDefault) {
            e.preventDefault()
        } else {
            window.event.returnValue = false
        }
    };

    /**
     * 获取本地存储记录
     * @param {any} name 账号
     * @param {any} key 键
     */
    uuid.cacheGet = function (name, key) {
        var result = { ok: false, value: null };

        var udata = localStorage.getItem(`uuid-github-${name}`);
        if (udata && udata != "") {
            var ujson = JSON.parse(udata);
            //缓存3天
            result.ok = new Date().valueOf() - ujson["__create__" + key] < 1000 * 3600 * 24 * 3;
            //值
            result.value = ujson[key];
        }
        return result;
    };

    /**
     * 设置本地存储记录
     * @param {any} name 账号
     * @param {any} key 键
     * @param {any} value 值
     */
    uuid.cacheSet = function (name, key, value) {
        var udata = localStorage.getItem(`uuid-github-${name}`);
        var ujson = {};
        if (udata && udata != "") {
            ujson = JSON.parse(udata);
        }
        ujson["__create__" + key] = new Date().valueOf();
        ujson[key] = value;
        localStorage.setItem(`uuid-github-${name}`, JSON.stringify(ujson));
    };

    /**
     * 清除当前用户的本地存储
     * @param {any} name 账号
     */
    uuid.cacheClear = function (name) {
        localStorage.removeItem(`uuid-github-${name}`);
        location.reload(false);
    }

    /**
     * 身份图标
     * @param {any} text 内容
     * @param {any} size 大小
     */
    uuid.iconident = function (value, size) {
        return iisvg({ value, size }).outerHTML
    }

    /**
     * 请求
     * @param {any} uu uuid对象
     * @param {any} src 链接
     * @param {any} callback 回调
     * @param {any} dataType 数据类型
     * @param {any} error 错误回调
     */
    uuid.fetch = function (uu, src, callback, dataType, error) {
        //优先取缓存
        var cg = uuid.cacheGet(uu.name, src);
        if (cg.ok && cg.value) {
            uu.iscache = true;
            callback(cg.value);
        } else {
            var init = {};
            if (uu.token && uu.token.length > 30) {
                init["headers"] = {
                    "Authorization": "token " + uu.token,
                }
            }
            if (uu.islimit) {
                return
            }
            fetch(src, init).then(function (res) {
                if (res.ok) {
                    return res[dataType]();
                } else {
                    if (res.status == 403) {
                        if (!uu.islimit) {
                            var htm = [
                                res.statusText + "(" + res.status + ")</br><hr/>",
                                '<div class="small text-muted">受限制，',
                                '<a href="/_token">设置token</a></div>'
                            ];
                            uu.showMessage(htm.join(''));
                        }
                        uu.islimit = true;
                    } else {
                        throw new Error(res)
                    }
                }
            }).then(function (data) {
                uu.iscache = false;
                callback(data);
                uuid.cacheSet(uu.name, src, data);
            }).catch(function (e) {
                if (cg.value) {
                    uu.iscache = true;
                    callback(cg.value);
                } else if (!uu.islimit) {
                    error && error(e)
                }
            })
        }
    }

    window.uuid = uuid;

})(window);

var uu = uuid();