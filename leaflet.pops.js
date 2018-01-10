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
        // Browser globals
        if (typeof this.L === 'undefined')
            throw 'Leaflet must be loaded first!';
        // Namespace        
		factory(this.L.TileLayer);
    }
}(function (nsTile) {


//Add hook to class L.TileLayer
nsTile.addInitHook(L.Util.extend(
//Hook for CRS-option TileLayer
function over(){
	
	if(this.options.crs){		
		var self = this,
			objSync={},
			fn_override=over.fn_list||['_reset','_update'],
			leftPointTestProps = over.leftPoint_propNames||['_initialTopLeftPoint','_pixelOrigin'],
			overrideBuilder=function ()
			{
				return function context_fn () {
					
					var params = !!objSync.running?context_fn.caller.arguments:arguments;
					
					if(!!!objSync.running)
					{
						objSync.running=true;						
						
						var result,						
							fn_map = function(a,b,c){
								for(var i=0;i<b.length;i++)
									if(b[i] in a)			
										a[b[i]]=c(b[i],a[b[i]]);			
							},
								 m = self._map,
								 o = m&&m.options,
								 z = m&&m.getZoom(),
								 new_crs = self.options.crs,
								 old_crs = o&&o.crs,
								 old_po;
									
						if(m&&!(new_crs===old_crs)) {									  									
								  old_po  = old_po||{};
								  fn_map(m,leftPointTestProps,function(key,value){
									 old_po[key]=value;
									 return new_crs.latLngToPoint(old_crs.pointToLatLng(value,z),z).round();				 
								  });
								  o.crs = new_crs;							
						}
						 
						result = context_fn.original.apply(self,params);
						
						if(old_po){
							fn_map(m,leftPointTestProps,function(key,value){ return old_po[key]; });
							o.crs = old_crs;
						}							
						
						objSync.running = false;
						return result;
					}
					
					return context_fn.original.apply(self,params);
				}
			},
			override,
			f,fn_name;
					
		
					
		for(f in fn_override){
			fn_name = fn_override[f];			
			if(fn_name in self){				
				override=overrideBuilder();				
				override.original=self[fn_name];
				self[fn_name]=override;
			}
		}		
	}
	
	if(this.options.detectFails) {
		
		var syncObjLoadTiles = { tiles:0,loaded:0,fails:0,layer:this },
			defaultFailsPercent=0.6;
		this.options.detectFails=typeof this.options.detectFails==='number'&&this.options.detectFails>0
								?(this.options.detectFails>1?this.options.detectFails/100:this.options.detectFails)
								:defaultFailsPercent;
		
		
		this.on('loading',function(){
			this.tiles=0;
			this.loaded=0;
			this.fails=0;
		},syncObjLoadTiles);
		
		
		this.on('tileloadstart',function(e){
			this.tiles++;			
			//Начало загрузки тайла
			//e.tile , e.coords
		},syncObjLoadTiles);
		
		this.on('tileload',function(e){
			this.loaded++;
			//Загрузка тайла
			//e.tile , e.coords
		},syncObjLoadTiles);
		
		this.on('tileerror',function(){
			//Ошибка загрузки тайлов
			//e.error ,e.tile , e.coords			
			this.fails++;
		},syncObjLoadTiles);
		
		
		this.on('load',function(){			
			//Загрузка всех тайлов
			//Если процент битых тайлов превышает заданный
			if(this.fails/this.tiles>this.layer.options.detectFails){
				this.layer._map.fire('needchangelayer',this);
			}
		},syncObjLoadTiles);
	}
},
{
	//Set list override function
	fn_list : ['_reset','_update'],
	//Set list leftTopPoint internal names
	leftPoint_propNames: ['_initialTopLeftPoint','_pixelOrigin']
})
),


//2GIS
nsTile.DGis = nsTile.extend({
   statics:{ create :function (url,options) {return new nsTile.DGis(url,options) }},  
   initialize: function(url,options){
		 var sd = {subdomains:[0,1,2,3,4,5]};		 
		 return nsTile.prototype.initialize.call(this,url||'http://tile{s}.maps.2gis.ru/tiles?x={x}&y={y}&z={z}',(options&&L.Util.extend({},sd,options))||sd);
    }
}),

//Yandex
nsTile.Yandex = nsTile.extend({
   statics:{ create :function (url,options) {return new nsTile.Yandex(url,options);}},  
   initialize: function(url,options){
		var sd = {crs:L.CRS.EPSG3395,subdomains:['01','02','03','04']};		
		return nsTile.prototype.initialize.call(this,url||'http://{s}.pvec.maps.yandex.net/?l=pmap&x={x}&y={y}&z={z}',(options&&L.Util.extend({},sd,options))||sd);		 
    }
}),

//OpenStreetMap 
nsTile.Osm = nsTile.extend({
   statics:{ create :function (url,options) {return new nsTile.Osm(url,options);}},  
   initialize: function(url,options){	     
		 return nsTile.prototype.initialize.call(this,url||'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',options);
    }
}),

//Google
nsTile.Google = nsTile.extend({
   statics:{ create :function (url,options) {return new nsTile.Google(url,options);}},  
   initialize: function(url,options){	     
		 return nsTile.prototype.initialize.call(this,url||'http://mt1.google.com/vt/lyrs=r&x={x}&y={y}&z={z}',options);
    }
}),

//Kosmosnimki
nsTile.Kosmosnimki = nsTile.extend({
   statics:{ create :function (url,options) {return new nsTile.Kosmosnimki(url,options);}},  
   initialize: function(url,options){
	   	var sd = {crs:L.CRS.EPSG3857},// EPSG3395, EPSG3857, EPSG4326
			defaultOptions = (options&&L.Util.extend({},sd,options))||sd,
			defaultLayer= defaultOptions.layerName||defaultOptions.layer||'04C9E7CE82C34172910ACDBF8F1DF49A';
			//'&apikey=7BDJ6RRTHH'
		//return nsTile.prototype.initialize.call(this,url||'http://maps.kosmosnimki.ru/TileService.ashx?Request=GetTile&layerName='+defaultLayer+'&apikey=7BDJ6RRTHH&crs='+defaultOptions.crs.code+'&x={x}&y={y}&z={z}',defaultOptions);
		//return nsTile.prototype.initialize.call(this,url||'http://maps.kosmosnimki.ru/TileSender.ashx?ModeKey=tile&z={z}&x={x}&y={y}&LayerName=C9458F2DCB754CEEACC54216C7D1EB0A&key=1QrppJY%2BAj5hdMtVagyXJtsQA2%2B35onyY1wvGI1y3Wr%2B0dZMsKQqW%2Fw2ucFzfFLWQ3S9v0gOvYkGw71EIGAz45WoyjzykYRhkW4qRRNXajA%3D',options);		
		return nsTile.prototype.initialize.call(this,url||'http://1.aerial.maps.api.here.com/maptile/2.1/maptile/newest/hybrid.day/{z}/{x}/{y}/256/png8?app_id=H0fSY1TZ9EpLJdBl6fo2&app_code=RYKAW1WGH87iZ-dYF5XAAQ&lg=rus',defaultOptions);
    }
})

	
}));