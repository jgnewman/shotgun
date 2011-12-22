/*
Name: shotgun.js
Author: John Newman
License: MIT
*/
(function(a){"use strict";var b={};function c(){var i,g='',h='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghiklmnopqrstuvwxyz_`~!?.,<>@#$%^*()[]{}|+=-/&:;';for(i=0;i<64;i+=1){g+=h[Math.floor(Math.random()*h.length)];}return g;}function d(m){var i,g,h,j,k=b[m.event];if(k&&k[m.key]){if(typeof m.key==='string'){m.key=[m.key];}h=m.key.length;for(i=0;i<h;i+=1){g=k[m.key[i]];j=g.action;if(j){j.apply(null,m.args);}}}else if(k&&!k[m.key]){for(i in k){if(Object.prototype.hasOwnProperty.call(k,i)){k[i].action.apply(null,m.args);}}}}function e(h){var g=h.key||c();b[h.event]=b[h.event]||{};b[h.event][g]={"action":h.action};d({"event":"newListener","args":[h]});return g;}function f(h){if(!h.key){if(b[h.event]){delete b[h.event];d({"event":"rmEvent","args":[h.event]});return true;}else{return false;}}if(b[h.event][h.key]){delete b[h.event][h.key];d({"event":"rmListener","args":[h.event,h.key]});return true;}else{return false;}}a.SG=a.SHOTGUN=a.SHOTGUN||{"fire":function(g){return d(g);},"listen":function(g){return e(g);},"remove":function(g){return f(g);},"events":function(){return b;}};}(this));
