(function($){$.flexslider=function(el,options){var slider=el;slider.init=function(){slider.vars=$.extend({},$.flexslider.defaults,options);slider.data('flexslider',!0);slider.container=$('.slides',slider);slider.slides=$('.slides > li',slider);slider.count=slider.slides.length;slider.animating=!1;slider.currentSlide=slider.vars.slideToStart;slider.animatingTo=slider.currentSlide;slider.atEnd=(slider.currentSlide==0)?!0:!1;slider.eventType=('ontouchstart'in document.documentElement)?'touchstart':'click';slider.cloneCount=0;slider.cloneOffset=0;slider.manualPause=!1;slider.vertical=(slider.vars.slideDirection=="vertical");slider.prop=(slider.vertical)?"top":"marginLeft";slider.args={};slider.transitions="webkitTransition"in document.body.style;if(slider.transitions)slider.prop="-webkit-transform";if(slider.vars.controlsContainer!=""){slider.controlsContainer=$(slider.vars.controlsContainer).eq($('.slides').index(slider.container));slider.containerExists=slider.controlsContainer.length>0}
if(slider.vars.manualControls!=""){slider.manualControls=$(slider.vars.manualControls,((slider.containerExists)?slider.controlsContainer:slider));slider.manualExists=slider.manualControls.length>0}
if(slider.vars.randomize){slider.slides.sort(function(){return(Math.round(Math.random())-0.5)});slider.container.empty().append(slider.slides)}
if(slider.vars.animation.toLowerCase()=="slide"){if(slider.transitions){slider.setTransition(0)}
slider.css({"overflow":"hidden"});if(slider.vars.animationLoop){slider.cloneCount=2;slider.cloneOffset=1;slider.container.append(slider.slides.filter(':first').clone().addClass('clone')).prepend(slider.slides.filter(':last').clone().addClass('clone'))}
slider.newSlides=$('.slides > li',slider);var sliderOffset=(-1*(slider.currentSlide+slider.cloneOffset));if(slider.vertical){slider.newSlides.css({"display":"block","width":"100%","float":"left"});slider.container.height((slider.count+slider.cloneCount)*200+"%").css("position","absolute").width("100%");setTimeout(function(){slider.css({"position":"relative"}).height(slider.slides.filter(':first').height());slider.args[slider.prop]=(slider.transitions)?"translate3d(0,"+sliderOffset*slider.height()+"px,0)":sliderOffset*slider.height()+"px";slider.container.css(slider.args)},100)}else{slider.args[slider.prop]=(slider.transitions)?"translate3d("+sliderOffset*slider.width()+"px,0,0)":sliderOffset*slider.width()+"px";slider.container.width((slider.count+slider.cloneCount)*200+"%").css(slider.args);setTimeout(function(){slider.newSlides.width(slider.width()).css({"float":"left","display":"block"})},100)}}else{slider.transitions=!1;slider.slides.css({"width":"100%","float":"left","marginRight":"-100%"}).eq(slider.currentSlide).fadeIn(slider.vars.animationDuration)}
if(slider.vars.controlNav){if(slider.manualExists){slider.controlNav=slider.manualControls}else{var controlNavScaffold=$('<ol class="flex-control-nav"></ol>');var j=1;for(var i=0;i<slider.count;i++){controlNavScaffold.append('<li><a>'+j+'</a></li>');j++}
if(slider.containerExists){$(slider.controlsContainer).append(controlNavScaffold);slider.controlNav=$('.flex-control-nav li a',slider.controlsContainer)}else{slider.append(controlNavScaffold);slider.controlNav=$('.flex-control-nav li a',slider)}}
slider.controlNav.eq(slider.currentSlide).addClass('active');slider.controlNav.bind(slider.eventType,function(event){event.preventDefault();if(!$(this).hasClass('active')){(slider.controlNav.index($(this))>slider.currentSlide)?slider.direction="next":slider.direction="prev";slider.flexAnimate(slider.controlNav.index($(this)),slider.vars.pauseOnAction)}})}
if(slider.vars.directionNav){var directionNavScaffold=$('<ul class="flex-direction-nav"><li><a class="prev" href="#">'+slider.vars.prevText+'</a></li><li><a class="next" href="#">'+slider.vars.nextText+'</a></li></ul>');if(slider.containerExists){$(slider.controlsContainer).append(directionNavScaffold);slider.directionNav=$('.flex-direction-nav li a',slider.controlsContainer)}else{slider.append(directionNavScaffold);slider.directionNav=$('.flex-direction-nav li a',slider)}
if(!slider.vars.animationLoop){if(slider.currentSlide==0){slider.directionNav.filter('.prev').addClass('disabled')}else if(slider.currentSlide==slider.count-1){slider.directionNav.filter('.next').addClass('disabled')}}
slider.directionNav.bind(slider.eventType,function(event){event.preventDefault();var target=($(this).hasClass('next'))?slider.getTarget('next'):slider.getTarget('prev');if(slider.canAdvance(target)){slider.flexAnimate(target,slider.vars.pauseOnAction)}})}
if(slider.vars.keyboardNav&&$('ul.slides').length==1){function keyboardMove(event){if(slider.animating){return}else if(event.keyCode!=39&&event.keyCode!=37){return}else{if(event.keyCode==39){var target=slider.getTarget('next')}else if(event.keyCode==37){var target=slider.getTarget('prev')}
if(slider.canAdvance(target)){slider.flexAnimate(target,slider.vars.pauseOnAction)}}}
$(document).bind('keyup',keyboardMove)}
if(slider.vars.mousewheel){slider.mousewheelEvent=(/Firefox/i.test(navigator.userAgent))?"DOMMouseScroll":"mousewheel";slider.bind(slider.mousewheelEvent,function(e){e.preventDefault();e=e?e:window.event;var wheelData=e.detail?e.detail*-1:e.wheelDelta/40,target=(wheelData<0)?slider.getTarget('next'):slider.getTarget('prev');if(slider.canAdvance(target)){slider.flexAnimate(target,slider.vars.pauseOnAction)}})}
if(slider.vars.slideshow){if(slider.vars.pauseOnHover&&slider.vars.slideshow){slider.hover(function(){slider.pause()},function(){if(!slider.manualPause){slider.resume()}})}
slider.animatedSlides=setInterval(slider.animateSlides,slider.vars.slideshowSpeed)}
if(slider.vars.pausePlay){var pausePlayScaffold=$('<div class="flex-pauseplay"><span></span></div>');if(slider.containerExists){slider.controlsContainer.append(pausePlayScaffold);slider.pausePlay=$('.flex-pauseplay span',slider.controlsContainer)}else{slider.append(pausePlayScaffold);slider.pausePlay=$('.flex-pauseplay span',slider)}
var pausePlayState=(slider.vars.slideshow)?'pause':'play';slider.pausePlay.addClass(pausePlayState).text((pausePlayState=='pause')?slider.vars.pauseText:slider.vars.playText);slider.pausePlay.bind(slider.eventType,function(event){event.preventDefault();if($(this).hasClass('pause')){slider.pause();slider.manualPause=!0}else{slider.resume();slider.manualPause=!1}})}
if('ontouchstart'in document.documentElement){var startX,startY,offset,cwidth,dx,startT,scrolling=!1;slider.each(function(){if('ontouchstart'in document.documentElement){this.addEventListener('touchstart',onTouchStart,!1)}});function onTouchStart(e){if(slider.animating){e.preventDefault()}else if(e.touches.length==1){slider.pause();cwidth=(slider.vertical)?slider.height():slider.width();startT=Number(new Date());offset=(slider.vertical)?(slider.currentSlide+slider.cloneOffset)*slider.height():(slider.currentSlide+slider.cloneOffset)*slider.width();startX=(slider.vertical)?e.touches[0].pageY:e.touches[0].pageX;startY=(slider.vertical)?e.touches[0].pageX:e.touches[0].pageY;slider.setTransition(0);this.addEventListener('touchmove',onTouchMove,!1);this.addEventListener('touchend',onTouchEnd,!1)}}
function onTouchMove(e){dx=(slider.vertical)?startX-e.touches[0].pageY:startX-e.touches[0].pageX;scrolling=(slider.vertical)?(Math.abs(dx)<Math.abs(e.touches[0].pageX-startY)):(Math.abs(dx)<Math.abs(e.touches[0].pageY-startY));if(!scrolling){e.preventDefault();if(slider.vars.animation=="slide"&&slider.transitions){if(!slider.vars.animationLoop){dx=dx/((slider.currentSlide==0&&dx<0||slider.currentSlide==slider.count-1&&dx>0)?(Math.abs(dx)/cwidth+2):1)}
slider.args[slider.prop]=(slider.vertical)?"translate3d(0,"+(-offset-dx)+"px,0)":"translate3d("+(-offset-dx)+"px,0,0)";slider.container.css(slider.args)}}}
function onTouchEnd(e){slider.animating=!1;if(slider.animatingTo==slider.currentSlide&&!scrolling&&!(dx==null)){var target=(dx>0)?slider.getTarget('next'):slider.getTarget('prev');if(slider.canAdvance(target)&&Number(new Date())-startT<550&&Math.abs(dx)>20||Math.abs(dx)>cwidth/2){slider.flexAnimate(target,slider.vars.pauseOnAction)}else{slider.flexAnimate(slider.currentSlide,slider.vars.pauseOnAction)}}
this.removeEventListener('touchmove',onTouchMove,!1);this.removeEventListener('touchend',onTouchEnd,!1);startX=null;startY=null;dx=null;offset=null}}
if(slider.vars.animation.toLowerCase()=="slide"){$(window).resize(function(){if(!slider.animating){if(slider.vertical){slider.height(slider.slides.filter(':first').height());slider.args[slider.prop]=(-1*(slider.currentSlide+slider.cloneOffset))*slider.slides.filter(':first').height()+"px";if(slider.transitions){slider.setTransition(0);slider.args[slider.prop]=(slider.vertical)?"translate3d(0,"+slider.args[slider.prop]+",0)":"translate3d("+slider.args[slider.prop]+",0,0)"}
slider.container.css(slider.args)}else{slider.newSlides.width(slider.width());slider.args[slider.prop]=(-1*(slider.currentSlide+slider.cloneOffset))*slider.width()+"px";if(slider.transitions){slider.setTransition(0);slider.args[slider.prop]=(slider.vertical)?"translate3d(0,"+slider.args[slider.prop]+",0)":"translate3d("+slider.args[slider.prop]+",0,0)"}
slider.container.css(slider.args)}}})}
slider.vars.start(slider)}
slider.flexAnimate=function(target,pause){if(!slider.animating){slider.animating=!0;slider.animatingTo=target;slider.vars.before(slider);if(pause){slider.pause()}
if(slider.vars.controlNav){slider.controlNav.removeClass('active').eq(target).addClass('active')}
slider.atEnd=(target==0||target==slider.count-1)?!0:!1;if(!slider.vars.animationLoop&&slider.vars.directionNav){if(target==0){slider.directionNav.removeClass('disabled').filter('.prev').addClass('disabled')}else if(target==slider.count-1){slider.directionNav.removeClass('disabled').filter('.next').addClass('disabled')}else{slider.directionNav.removeClass('disabled')}}
if(!slider.vars.animationLoop&&target==slider.count-1){slider.pause();slider.vars.end(slider)}
if(slider.vars.animation.toLowerCase()=="slide"){var dimension=(slider.vertical)?slider.slides.filter(':first').height():slider.slides.filter(':first').width();if(slider.currentSlide==0&&target==slider.count-1&&slider.vars.animationLoop&&slider.direction!="next"){slider.slideString="0px"}else if(slider.currentSlide==slider.count-1&&target==0&&slider.vars.animationLoop&&slider.direction!="prev"){slider.slideString=(-1*(slider.count+1))*dimension+"px"}else{slider.slideString=(-1*(target+slider.cloneOffset))*dimension+"px"}
slider.args[slider.prop]=slider.slideString;if(slider.transitions){slider.setTransition(slider.vars.animationDuration);slider.args[slider.prop]=(slider.vertical)?"translate3d(0,"+slider.slideString+",0)":"translate3d("+slider.slideString+",0,0)";slider.container.css(slider.args).one("webkitTransitionEnd transitionend",function(){slider.wrapup(dimension)})}else{slider.container.animate(slider.args,slider.vars.animationDuration,function(){slider.wrapup(dimension)})}}else{slider.slides.eq(slider.currentSlide).fadeOut(slider.vars.animationDuration);slider.slides.eq(target).fadeIn(slider.vars.animationDuration,function(){slider.wrapup()})}}}
slider.wrapup=function(dimension){if(slider.vars.animation=="slide"){if(slider.currentSlide==0&&slider.animatingTo==slider.count-1&&slider.vars.animationLoop){slider.args[slider.prop]=(-1*slider.count)*dimension+"px";if(slider.transitions){slider.setTransition(0);slider.args[slider.prop]=(slider.vertical)?"translate3d(0,"+slider.args[slider.prop]+",0)":"translate3d("+slider.args[slider.prop]+",0,0)"}
slider.container.css(slider.args)}else if(slider.currentSlide==slider.count-1&&slider.animatingTo==0&&slider.vars.animationLoop){slider.args[slider.prop]=-1*dimension+"px";if(slider.transitions){slider.setTransition(0);slider.args[slider.prop]=(slider.vertical)?"translate3d(0,"+slider.args[slider.prop]+",0)":"translate3d("+slider.args[slider.prop]+",0,0)"}
slider.container.css(slider.args)}}
slider.animating=!1;slider.currentSlide=slider.animatingTo;slider.vars.after(slider)}
slider.animateSlides=function(){if(!slider.animating){slider.flexAnimate(slider.getTarget("next"))}}
slider.pause=function(){clearInterval(slider.animatedSlides);if(slider.vars.pausePlay){slider.pausePlay.removeClass('pause').addClass('play').text(slider.vars.playText)}}
slider.resume=function(){slider.animatedSlides=setInterval(slider.animateSlides,slider.vars.slideshowSpeed);if(slider.vars.pausePlay){slider.pausePlay.removeClass('play').addClass('pause').text(slider.vars.pauseText)}}
slider.canAdvance=function(target){if(!slider.vars.animationLoop&&slider.atEnd){if(slider.currentSlide==0&&target==slider.count-1&&slider.direction!="next"){return!1}else if(slider.currentSlide==slider.count-1&&target==0&&slider.direction=="next"){return!1}else{return!0}}else{return!0}}
slider.getTarget=function(dir){slider.direction=dir;if(dir=="next"){return(slider.currentSlide==slider.count-1)?0:slider.currentSlide+1}else{return(slider.currentSlide==0)?slider.count-1:slider.currentSlide-1}}
slider.setTransition=function(dur){slider.container.css({'-webkit-transition-duration':(dur/1000)+"s"})}
slider.init()}
$.flexslider.defaults={animation:"fade",slideDirection:"horizontal",slideshow:!0,slideshowSpeed:7000,animationDuration:600,directionNav:!0,controlNav:!0,keyboardNav:!0,mousewheel:!1,prevText:"Previous",nextText:"Next",pausePlay:!1,pauseText:'Pause',playText:'Play',randomize:!1,slideToStart:0,animationLoop:!0,pauseOnAction:!0,pauseOnHover:!1,controlsContainer:"",manualControls:"",start:function(){},before:function(){},after:function(){},end:function(){}}
$.fn.flexslider=function(options){return this.each(function(){if($(this).find('.slides li').length==1){$(this).find('.slides li').fadeIn(400)}else if($(this).data('flexslider')!=!0){new $.flexslider($(this),options)}})}})(jQuery)