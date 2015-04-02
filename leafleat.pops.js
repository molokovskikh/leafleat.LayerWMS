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
function(){
	
	if(this.options.crs){		
		var self = this,
			objSync={},
			fn_override=arguments.callee.fn_list||['_reset','_update'],
			leftPointTestProps = arguments.callee.leftPoint_propNames||['_initialTopLeftPoint','_pixelOrigin'],
			override,
			f,fn_name;
					
		for(f in fn_override){
			fn_name = fn_override[f];			
			if(fn_name in self){
				
				override=function() {
					
					var context_fn = arguments.callee,
						params = !!objSync.running?context_fn.caller.arguments:arguments;
					
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
				};				
				override.original=self[fn_name];
				self[fn_name]=override;
			}
		}		
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
		var sd = {crs:L.CRS.EPSG3395,subdomains:['00','01','02','03','04']};		
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
})

	
}));