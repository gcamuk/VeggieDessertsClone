self.studioLoader.context.evalInContext("window.STUDIO_SDK_START=+new Date();var vn=function(a){return(a=a.exec(tb))?a[1]:\"\"};(function(){if(Af)return vn(/Firefox\\/([0-9.]+)/);if(ac||bc||Zb)return kc;if(Ef)return Vb()?vn(/CriOS\\/([0-9.]+)/):vn(/Chrome\\/([0-9.]+)/);if(Ff&&!Vb())return vn(/Version\\/([0-9.]+)/);if(Bf||Cf){var a=/Version\\/(\\S+).*Mobile\\/(\\S+)/.exec(tb);if(a)return a[1]+\".\"+a[2]}else if(Df)return(a=vn(/Android\\s+([0-9.]+)/))?a:vn(/Version\\/([0-9.]+)/);return\"\"})();var wn={},xn=/OS (\\S+) like/,yn=/Android (\\S+);/,zn=function(a,b){null==wn[b]&&((a=a.exec(tb))?(a=a[1].replace(/_/g,\".\"),wn[b]=0<=sb(a,b)):wn[b]=!1);return wn[b]};var An=function(){J.call(this);this.h=this.j=this.f=!1;this.b=0;this.l=[];this.w=!1};z(An,J);var Bn=function(a,b){null==b||a.f||(a.a=b,a.A=!Bf&&!Cf,a.C=Bf||Cf,a.A?a.a.addEventListener(\"click\",x(a.s,a),!1):a.C&&(a.a.addEventListener(\"touchstart\",x(a.I,a),!1),a.a.addEventListener(\"touchmove\",x(a.F,a),!1),a.a.addEventListener(\"touchend\",x(a.G,a),!1)),a.f=!0)},Cn=function(a){null!=a.a&&a.f&&(a.f=!1,a.A?a.a.removeEventListener(\"click\",x(a.s,a),!1):a.C&&(a.a.removeEventListener(\"touchstart\",x(a.I,a),!1),a.a.removeEventListener(\"touchmove\",x(a.F,a),!1),a.a.removeEventListener(\"touchend\",x(a.G,a),!1)))};An.prototype.I=function(a){this.j=!0;this.b=a.touches.length;this.w=Dn(this,a.touches)||1!=a.touches.length;a=a.touches;this.l=[];for(var b=0;b<a.length;b++)this.l.push(a[b].identifier)};An.prototype.F=function(a){this.h=!0;this.b=a.touches.length};An.prototype.G=function(a){this.j&&1==this.b&&!this.h&&!this.w&&Dn(this,a.changedTouches)&&this.dispatchEvent(new ze(\"click\"));this.b=a.touches.length;0==this.b&&(this.h=this.j=!1)};An.prototype.s=function(){this.dispatchEvent(new ze(\"click\"))};var Dn=function(a,b){for(var c=0;c<b.length;c++)if(a.l.includes(b[c].identifier))return!0;return!1};var En=function(a){ze.call(this,a)};z(En,ze);var Fn=function(){J.call(this)};z(Fn,J);var Gn=function(){J.call(this);this.h=new H;this.l=new An;this.s=\"none\"};z(Gn,J);var Jn=function(a){this.width=Hn(a).width;this.height=Hn(a).height;this.f=!1;this.b=a.a.muted;this.a=In(a);this.volume=a.a.volume};Jn.prototype.muted=function(a,b){return!this.b&&a||0<this.volume&&0==b};Gn.prototype.v=function(){Kn(this);Gn.o.v.call(this)};var Kn=function(a){null!=a.b&&a.b.dispose();null!=a.j&&a.j.dispose();null!=a.a&&Ln(a.a);ue(a.h);Cn(a.l)},Z=function(a,b,c){c&&null!=a.h.get(b)||(a.h.set(b,!0),a.dispatchEvent(new En(b)))},Mn=function(a,b){null!=a.h.get(b)&&ve(a.h,b)};g=Gn.prototype;g.Ad=function(){a:{var a=this.a;if(a.a.seeking&&!a.j)a.j=!0,a.l=Nn(a);else{if(!a.a.seeking&&a.j){a.j=!1;var b=0!=a.a.currentTime&&a.a.currentTime<a.l;a.l=-1;break a}if(!a.a.seeking&&0!=a.a.currentTime&&Nn(a)>a.a.currentTime){b=.5<Nn(a)-a.a.currentTime;break a}}b=!1}a=On(this.a);if(b&&(Z(this,\"rewind\",!1),-1!=a)){Nn(this.a)>=.75*a||Mn(this,\"thirdquartile\");Nn(this.a)>=.5*a||Mn(this,\"midpoint\");Nn(this.a)>=.25*a||Mn(this,\"firstquartile\");a:{b=this.a;for(var c=b.f.K(),d=c.length-1;0<=d;d--)if(.5>c[d]){c=b.f;c=0==c.V()?null:c.get(c.V()-1);d=b.f;d.a.length=0;d.b=0;.5<=c&&b.f.add(c);b=!0;break a}b=!1}b&&Z(this,\"replay\",!1)}-1!=a&&(Nn(this.a)>=.25*a&&Z(this,\"firstquartile\",!0),Nn(this.a)>=.5*a&&Z(this,\"midpoint\",!0),Nn(this.a)>=.75*a&&Z(this,\"thirdquartile\",!0))};g.zd=function(){Z(this,\"creativeview\",!0);null!=this.w?(M(this.b,this.l,\"click\",this.vd,!1),Bn(this.l,this.w)):M(this.b,this.a,\"click\",this.$d,void 0);Z(this,\"start\",!0);(this.a.a.muted||0==this.a.a.volume)&&Z(this,\"mute\",!1)};g.Bd=function(){var a=this.a.a.muted,b=this.a.a.volume,c=this.f;c.b&&!a||!a&&0==c.volume&&0<b?Z(this,\"unmute\",!1):this.f.muted(a,b)&&Z(this,\"mute\",!1);this.f.b=a;this.f.volume=b};g.yd=function(){if(this.a.a.ended)Z(this,\"complete\",!0);else{var a;if(a=\"pausedAtBeginning\"==this.s)a=this.a,a=!isNaN(a.a.duration)&&0<a.a.duration&&0==a.a.currentTime;a?Z(this,\"stop\",!0):Pn(this.a)&&!this.a.a.seeking&&(this.f.f=!0,Z(this,\"pause\",!1))}};g.Zd=function(){this.f.f&&(this.f.f=!1,Z(this,\"resume\",!1))};g.wd=function(){var a=this.a;if(!Df||Df&&zn(yn,2.3))a=!0;else{var b=a.a.duration-Nn(a);a=0==a.a.currentTime&&1.5>=b}a?\"pausedAtEnd\"==this.s&&Pn(this.a)?Z(this,\"stop\",!0):Z(this,\"complete\",!0):this.a.a.pause()};g.vd=function(){Z(this,\"click\",!1)};g.xd=function(){Z(this,\"error\",!1)};g.$d=function(){Z(this,\"click\",!1)};g.gc=function(){this.f.a=!0;Z(this,\"fullscreen\",!1)};g.fc=function(){this.f.a=!1};g.Yd=function(){var a=Hn(this.a),b=In(this.a),c=this.f;if(a.width!=c.width||a.height!=c.height)!this.f.a&&b?this.gc():this.f.a&&!b&&this.fc(),this.f.width=a.width,this.f.height=a.height};var Qn=function(){this.b=0;this.a=[]};g=Qn.prototype;g.add=function(a){var b=this.a[this.b];this.a[this.b]=a;this.b=(this.b+1)%4;return b};g.get=function(a){a=Rn(this,a);return this.a[a]};g.set=function(a,b){a=Rn(this,a);this.a[a]=b};g.V=function(){return this.a.length};g.K=function(){var a=this.V(),b=this.V(),c=[];for(a=this.V()-a;a<b;a++)c.push(this.get(a));return c};g.O=function(){for(var a=[],b=this.V(),c=0;c<b;c++)a[c]=c;return a};g.P=function(a){return a<this.V()};g.Ea=function(a){for(var b=this.V(),c=0;c<b;c++)if(this.get(c)==a)return!0;return!1};var Rn=function(a,b){if(b>=a.a.length)throw Error(\"Out of bounds exception\");return 4>a.a.length?b:(a.b+Number(b))%4};var Sn=function(a){J.call(this);this.a=a;this.f=new Qn;this.l=-1;this.s=this.j=!1};z(Sn,Fn);var On=function(a){return isNaN(a.a.duration)?-1:a.a.duration},Pn=function(a){return a.a.paused?Bf||Cf||Ef?a.a.currentTime<a.a.duration:!0:!1},In=function(a){return Bf?a.a.webkitSupportsFullscreen&&a.a.webkitDisplayingFullscreen:a.a.offsetWidth>=document.body.offsetWidth&&a.a.offsetHeight>=document.body.offsetHeight},Nn=function(a){for(a=a.f.K();a.length;){var b=a.pop();if(0<b)return b}return-1},Hn=function(a){return new Xc(a.a.offsetWidth,a.a.offsetHeight)};Sn.prototype.v=function(){Sn.o.v.call(this);Ln(this)};var Ln=function(a){null!=a.h&&(Cn(a.h),a.h=null);null!=a.b&&(a.b.dispose(),a.b=null);a.l=-1;a.s=!1;a.j=!1;a=a.f;a.a.length=0;a.b=0},Tn=function(a,b){a.s||(a.s=!0,a.dispatchEvent(\"start\"),!Df&&(!Bf||(Bf||Cf)&&zn(xn,4))||a.hc(b))};g=Sn.prototype;g.Xd=function(){Ff&&(this.a.currentTime=.001)};g.oc=function(a){this.dispatchEvent(\"play\");Bf||Cf||Tn(this,a)};g.Hd=function(a){this.s||((Bf||Cf)&&0<this.a.currentTime&&Tn(this,a),dc&&this.oc(a));this.f.add(this.a.currentTime);this.dispatchEvent(\"timeUpdate\")};g.Id=function(){this.dispatchEvent(\"volumeChange\")};g.Gd=function(){this.dispatchEvent(\"pause\")};g.Dd=function(){this.dispatchEvent(\"end\")};g.hc=function(){this.dispatchEvent(\"beginFullscreen\")};g.Fd=function(){this.dispatchEvent(\"endFullscreen\")};g.Ed=function(){this.dispatchEvent(\"error\")};g.Cd=function(){this.dispatchEvent(\"click\")};var Un={},Vn=function(a){this.l=a;this.h=this.g=!0;this.f=new Gn;this.f.s=\"pausedAtBeginning\";this.j=this.a=this.b=null;yj(x(this.T,this))},Wn=new H;Vn.prototype.w=!1;Vn.prototype.s=!1;Vn.prototype.B=!0;var Xn=function(a){var b=Wn.get(a);null==b&&(b=new Vn(a),Wn.set(a,b));return b};Vn.prototype.T=function(a){this.a=a;Yn(this)};var Yn=function(a){Zn(a,!1);Zn(a,!0);if(null!=a.a&&null!=a.j){var b=a.f,c=a.b;Kn(b);b.a=c;c=b.a;Ln(c);c.b=new L(c);M(c.b,c.a,\"canplay\",c.Xd,void 0);M(c.b,c.a,\"ended\",c.Dd,void 0);M(c.b,c.a,\"webkitbeginfullscreen\",c.hc,void 0);M(c.b,c.a,\"webkitendfullscreen\",c.Fd,void 0);M(c.b,c.a,\"pause\",c.Gd,void 0);M(c.b,c.a,\"playing\",c.oc,void 0);M(c.b,c.a,\"timeupdate\",c.Hd,void 0);M(c.b,c.a,\"volumechange\",c.Id,void 0);M(c.b,c.a,\"error\",c.Ed,void 0);c.h=new An;M(c.b,c.h,\"click\",c.Cd,!1);Bn(c.h,c.a);b.f=new Jn(b.a);b.w=null;b.b=new L(b);M(b.b,b.a,\"timeUpdate\",b.Ad,!1);M(b.b,b.a,\"volumeChange\",b.Bd,!1);M(b.b,b.a,\"pause\",b.yd,!1);M(b.b,b.a,\"play\",b.Zd,!1);M(b.b,b.a,\"end\",b.wd,!1);M(b.b,b.a,\"beginFullscreen\",b.gc,!1);M(b.b,b.a,\"endFullscreen\",b.fc,!1);M(b.b,b.a,\"start\",b.zd,!1);M(b.b,b.a,\"error\",b.xd,!1);b.j=new kf(1E3);M(b.b,b.j,\"tick\",b.Yd,!1,b);b.j.start();a.b.za(\"timeUpdate\",a.Gc,!1,a);a.j.paused?a.f.za(\"start\",a.Za,!1,a):a.Za()}},Zn=function(a,b){$n(a,b,\"resume\",a.Za);$n(a,b,\"replay\",a.ge);$n(a,b,\"pause\",a.be);$n(a,b,\"stop\",a.ue);$n(a,b,\"mute\",a.Ud);$n(a,b,\"unmute\",a.Ee);$n(a,b,\"firstquartile\",a.Yc);$n(a,b,\"midpoint\",a.Td);$n(a,b,\"thirdquartile\",a.Ae);$n(a,b,\"complete\",a.Qc)},$n=function(a,b,c,d){(b?a.f.za:a.f.Ha).call(a.f,c,d,!1,a)};g=Vn.prototype;g.Za=function(){this.f.Ha(\"start\",this.Za,!1,this);this.a.dispatchEvent(new K(\"videoStart\"));ao(this,\"play\",!this.B);bo(this,\"Start\");this.B=!1;null!=this.a&&this.h&&!this.w&&(this.a.w(),this.w=!0)};g.ge=function(){ao(this,\"replay\",!0);bo(this,\"Stop\");this.g=!1};g.be=function(){ao(this,\"pause\",!0);bo(this,\"Stop\")};g.ue=function(){ao(this,\"stop\",!0);bo(this,\"Stop\");this.g=!1};g.Ud=function(){ao(this,\"mute\",!this.B)};g.Ee=function(){ao(this,\"unmute\",!this.B)};g.Yc=function(){ao(this,\"firstquartile\")};g.Td=function(){ao(this,\"midpoint\")};g.Ae=function(){ao(this,\"thirdquartile\")};g.Qc=function(){ao(this,\"complete\");bo(this,\"Stop\");this.g=!1;null!=this.a&&this.h&&!this.s&&(this.a.w(),this.s=!0)};g.Gc=function(a){N(this.a.D,\"updateVideoProgress\",[\"EVENT_VIDEO_\"+a.type.toUpperCase(),On(this.b),this.b.a.currentTime])};var ao=function(a,b,c){null!=a.a&&a.h&&(c&&Zh(a.a.b,\"Count\",a.l,\"EVENT_VIDEO_INTERACTION\"),Zh(a.a.b,\"Count\",a.l,\"EVENT_VIDEO_\"+b.toUpperCase()))},bo=function(a,b){null!=a.a&&a.h&&a.g&&Zh(a.a.b,b,a.l,\"EVENT_VIDEO_VIEW_TIMER\")};var co=function(a){I.call(this);this.f=a;this.a={};this.b=null;yj(x(this.g,this))};z(co,I);r(\"studio.video.Reporter\",co,void 0);var eo=new H,fo=function(a,b,c){var d=Xn(a);\"boolean\"==typeof c&&(d.B=c);Kn(d.f);d.g=!0;d.h=!0;d.j=b;d.b=new Sn(d.j);Yn(d);eo.P(a)||eo.set(a,new co(b))};co.attach=fo;co.prototype.g=function(a){this.b=a;this.b.Sb(this.f)};co.prototype.v=function(){for(var a in this.a)this.f[a]=this.a[a];co.o.v.call(this)};var go=function(a){a=Xn(a);null==a.b||Pn(a.b)||a.b.a.ended||(ao(a,\"stop\",!1),bo(a,\"Stop\"),a.g=!1);Zn(a,!1);a.h=!1;a.j=null;Kn(a.f);a.b&&(a.b.Ha(\"timeUpdate\",a.Gc,!1,a),a.b.dispose())};co.detach=go;var ho=function(){};var io,jo=function(){};z(jo,ho);var ko=function(a){a:{if(!a.a&&\"undefined\"==typeof XMLHttpRequest&&\"undefined\"!=typeof ActiveXObject){for(var b=[\"MSXML2.XMLHTTP.6.0\",\"MSXML2.XMLHTTP.3.0\",\"MSXML2.XMLHTTP\",\"Microsoft.XMLHTTP\"],c=0;c<b.length;c++){var d=b[c];try{new ActiveXObject(d);var e=a.a=d;break a}catch(f){}}throw Error(\"Could not create ActiveXObject. ActiveX might be disabled, or MSXML might not be installed\");}e=a.a}return e?new ActiveXObject(e):new XMLHttpRequest};io=new jo;var mo=function(a,b){b=b?Gb(b):{};b.responseType=\"blob\";return lo(\"GET\",a,b).then(function(a){return a.response})},lo=function(a,b,c){var d=c||{},e=d.Le?ko(d.Le):ko(io);return Sd(new Id(function(c,k){var f;try{e.open(a,b,!0)}catch(E){k(new no(\"Error opening XHR: \"+E.message,b,e))}e.onreadystatechange=function(){if(4==e.readyState){h.clearTimeout(f);a:switch(e.status){case 200:case 201:case 202:case 204:case 206:case 304:case 1223:var a=!0;break a;default:a=!1}!a&&(a=0===e.status)&&(a=b.match($f)[1]||null,!a&&h.self&&h.self.location&&(a=h.self.location.protocol,a=a.substr(0,a.length-1)),a=a?a.toLowerCase():\"\",a=!(\"http\"==a||\"https\"==a||\"\"==a));a?c(e):k(new oo(e.status,b,e))}};e.onerror=function(){k(new no(\"Network error\",b,e))};if(d.headers){for(var t in d.headers){var q=d.headers[t];null!=q&&e.setRequestHeader(t,q)}q=d.headers[\"Content-Type\"]}t=h.FormData&&!1;\"POST\"!=a||void 0!==q||t||e.setRequestHeader(\"Content-Type\",\"application/x-www-form-urlencoded;charset=utf-8\");d.withCredentials&&(e.withCredentials=d.withCredentials);d.responseType&&(e.responseType=d.responseType);d.mimeType&&e.overrideMimeType(d.mimeType);0<d.Ce&&(f=h.setTimeout(function(){e.onreadystatechange=va;e.abort();k(new po(b,e))},d.Ce));try{e.send(null)}catch(E){e.onreadystatechange=va,h.clearTimeout(f),k(new no(\"Error sending XHR: \"+E.message,b,e))}}),function(a){a instanceof Td&&e.abort();throw a;})},no=function(a,b){Na.call(this,a+\", url=\"+b);this.url=b};z(no,Na);no.prototype.name=\"XhrError\";var oo=function(a,b,c){no.call(this,\"Request Failed, status=\"+a,b,c);this.status=a};z(oo,no);oo.prototype.name=\"XhrHttpError\";var po=function(a,b){no.call(this,\"Request timed out\",a,b)};z(po,no);po.prototype.name=\"XhrTimeoutError\";r(\"studio.sdk.video.VideoResource.getBlobForUrl\",function(a){return zj().then(function(b){b=b.Ga(a);return\"file:\"==window.location.protocol?Nd(Error(\"You cannot fetch the blob of a video when running locally. Run a local web server to test this creative (For example, python -m SimpleHTTPServer).\")):qb(b,\"/itag/\")?qo(ro(b)).then(mo):mo(b)})},void 0);var qo=function(a){return lo(\"HEAD\",a).then(function(b){return so(b)?lo(\"GET\",a).then(function(a){return qo(a.response)}):a})},ro=function(a){return qb(a,\"/itag/\")&&!qb(a,\"/alr/yes/\")?(a=a.split(\"/\"),a.splice(a.length-2,0,\"alr\",\"yes\"),a.join(\"/\")):a},so=function(a){a=a.getResponseHeader(\"Content-Type\");return qb(a,\"text/plain\")};");
