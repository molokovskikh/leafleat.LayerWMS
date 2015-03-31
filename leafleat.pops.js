/*
   leaflet.pops.js
 * Collection of popular tile layers.
 * (c) 2014, Sergey Molokovskikh 
*/
(function (factory) {
    // Module systems magic dance, Leaflet edition
    if (typeof define === 'function' && define.amd) {
        // AMD
        define(['leaflet'], factory);
    } else if (typeof module !== 'undefined') {
        // Node/CommonJS
        module.exports = factory(require('leaflet'));
    } else {
        // Проверка на Leafleat
        if (typeof this.L === 'undefined')
            throw 'Leaflet must be loaded first!';
        // Namespace        
		factory(this.L.TileLayer);
    }
}(function (nsTile) {


//2GIS
nsTile.DGis = nsTile.extend({
   statics:{ create :function (url,options) {return new nsTile.DGis(url,options) }},  
   initialize: function(url,options)
	{
		 var sd = {subdomains:[0,1,2,3,4,5]};		 
		 return nsTile.prototype.initialize.call(this,url||'http://tile{s}.maps.2gis.ru/tiles?x={x}&y={y}&z={z}',(options&&L.Util.extend({},sd,options))||sd);
    }
}),

//Yandex
nsTile.Yandex = nsTile.extend({
   statics:{ create :function (url,options) {return new nsTile.Yandex(url,options);}},  
   initialize: function(url,options)
	{
		var sd = {subdomains:['00','01','02','03','04']};
		return nsTile.prototype.initialize.call(this,url||'http://{s}.pvec.maps.yandex.net/?l=pmap&x={x}&y={y}&z={z}',(options&&L.Util.extend({},sd,options))||sd);		 
    },
	_overrideFn:function(name,params)
	{				 
		var protoTile  = nsTile.prototype;
				
		 if(!(name in protoTile))
			 return;
		 
		 var fn = protoTile[name],
			 m = this._map,
			 o = m&&m.options,
			 yandexCrs = L.CRS.EPSG3395,
			 old_crs = o&&o.crs,
			 old_po  = m&&m._pixelOrigin;
				
		if(m) m._pixelOrigin = yandexCrs.latLngToPoint(old_crs.pointToLatLng(m._pixelOrigin,m.getZoom()),m.getZoom()).round();		
		
		if(o) o.crs = yandexCrs;
		 
		var r = fn&&fn.apply(this,params||arguments.callee.caller.arguments);
		
		if(m) m._pixelOrigin = old_po;
		if(o) o.crs = old_crs;
		
		return r;
	},
	_reset:function()
	{
		return this._overrideFn('_reset');		
	},
	
	_update:function()
	{
		return this._overrideFn('_update');		
	}
}),

//OpenStreetMap 
nsTile.Osm = nsTile.extend({
   statics:{ create :function (url,options) {return new nsTile.Osm(url,options);}},  
   initialize: function(url,options)
	{
		 return nsTile.prototype.initialize.call(this,url||'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',options);
    }
}),

//Google
nsTile.Google = nsTile.extend({
   statics:{ create :function (url,options) {return new nsTile.Google(url,options);}},  
   initialize: function(url,options)
	{
		 return nsTile.prototype.initialize.call(this,url||'http://mt1.google.com/vt/lyrs=r&x={x}&y={y}&z={z}',options);
    }
})

	
}));