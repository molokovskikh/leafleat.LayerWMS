/*
 leaflet.Rosreestr.js
 * Control search object in service PKK by Rosreestr.
 * (c) 2015, Sergey Molokovskikh
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

        if (typeof this.L.Control.Search === 'undefined')
            throw 'Leaflet.ControlSearch must be loaded first!';
		
		if (typeof this.jQuery === 'undefined')
            throw 'jQuery must be loaded first!';
        // Namespace
        factory(this.L.Control);
    }
}(function (nsControl) {

    if(!L.CRS.EPSG3857.unproject)
        L.CRS.EPSG3857.unproject=function(p){ return L.CRS.EPSG3857.projection.unproject(p.divideBy(L.Projection.Mercator.R_MAJOR)) };

    nsControl.Rosreestr = nsControl.Search.extend({
        statics:{ create :function (options) {return new nsControl.Rosreestr(options);}},
            options: {
                wrapper: '',				//container id to insert Search Control
                url: '',					//url for search by ajax request, ex: "search.php?q={s}"
                jsonpParam: null,			//jsonp param name for search by jsonp service, ex: "callback"
                layer: null,				//layer where search markers(is a L.LayerGroup)
                callData: null,				//function that fill _recordsCache, passed searching text by first param and callback in second
                //TODO important! implements uniq option 'sourceData' that recognizes source type: url,array,callback or layer
                //TODO implement can do research on multiple sources
                propertyName: 'title',		//property in marker.options(or feature.properties for vector layer) trough filter elements in layer,
                propertyLoc: 'loc',			//field for remapping location, using array: ['latname','lonname'] for select double fields(ex. ['lat','lon'] )
                // support dotted format: 'prop.subprop.title'
                callTip: null,				//function that return row tip html node(or html string), receive text tooltip in first param
                filterJSON: null,			//callback for filtering data to _recordsCache
                minLength: 3,				//minimal text length for autocomplete
                initial: true,				//search elements only by initial text
                autoType: true,				//complete input with first suggested result and select this filled-in text.
                delayType: 400,				//delay while typing for show tooltip
                tooltipLimit: -1,			//limit max results to show in tooltip. -1 for no limit.
                tipAutoSubmit: true,  		//auto map panTo when click on tooltip
                autoResize: true,			//autoresize on input change
                collapsed: true,			//collapse search control at startup
                autoCollapse: false,		//collapse search control after submit(on button or on tips if enabled tipAutoSubmit)
                //TODO add option for persist markerLoc after collapse!
                autoCollapseTime: 1200,		//delay for autoclosing alert and collapse after blur
                zoom: null,					//zoom after pan to location found, default: map.getZoom()
                text: 'Кадастровый номер, адрес, координаты...',			//placeholder value
				textExpand:'Найти',
                textCancel: 'Очистить',		//title in cancel button
                textErr: 'Поиск не дал результатов',	//error message
                position: 'topleft',
                animateLocation: true,		//animate a circle over location found
                circleLocation: true,		//draw a circle in location found
                markerLocation: false,		//draw a marker in location found
                markerIcon: new L.Icon.Default()//custom icon for maker location
            },		
        initialize: function (options) {

            L.Util.setOptions(this, options);
			
			this.options.callTip = this._buildProxyFn('_callTip');
			this.options.filterJSON = this._buildProxyFn('_filterJSON');
            this.options.callData =  this._buildProxyFn('_search');
			nsControl.Search.prototype.initialize.call(this,this.options);
			
			this._cache=null;
			this._pkey=this.options.propertyLoc||'loc';
			this._pval=this.options.propertyName||'title';
			this._ptype='_sourceType';
			
			
        },
		
        onAdd:function(map){
            var container = nsControl.Search.prototype.onAdd.call(this,map);
			map.on('searchcomplete',function(e){
				debugger
			});
			           
            this.on('search_locationfound',function(e){
                debugger
				var obj = this._getObjectFromCache(e.text);
				if(obj&&this._ptype in obj) {
					if(obj[this._ptype]=='rosreestr'){		
						map.fire('searchcomplete',{
							mapObjects: [
											{
												kadastrNo:obj.CAD_NUM,
												latLng:obj[this._pkey],
												attributesJSON: obj._getJSON?obj._getJSON():JSON.stringify(_extendWithoutCircular({},obj))
											}
										]
	/*				
						map.fire('searchcomplete',
							{
								mapObjects:
									[
										{
											kadastrNo:'42:30',
											latLng: {lat:55,lng:34},
											attributesJSON:'{desc:"Описание",name:"Название",price:"Стоимость"}'
										},
										{
											kadastrNo:'42:31',
											latLng: {lat:54,lng:36},
											attributesJSON:'{desc:"Описание2",name:"Название2",price:"Стоимость2"}'
										}
									]
							});
	*/						
						});
						debugger
					
					}
				}
			});

            return container;
        },
        onRemove:function(map){
            nsControl.Search.prototype.onRemove.call(this,map);
        },
		expand:function(){						
			if(this.options.textExpand&&this.options.textExpand!==this.options.text)
				this._button.title = this.options.textExpand;		
			nsControl.Search.prototype.expand.apply(this,arguments);
		},
		collapse:function(){
			
			nsControl.Search.prototype.collapse.apply(this,arguments);
			
			if(this.options.textExpand&&this.options.textExpand!==this.options.text)
				this._button.title = this.options.text;
		},
		
		_buildProxyFn:function(name){
			var self=this,
				fn=self[name];
			if(fn)	
			return function() {				
				return fn.apply(self,arguments);
			};
		},
		_filterJSON:function(jsonraw){
			this._cache = this._buildCache(jsonraw);
			return this._defaultFilterJSON(jsonraw);
		},
		_buildCache:function(jsonraw){
			if(jsonraw instanceof Array){
				var c={},i,k;
				for(i =0;i<jsonraw.length;i++){					
					if((k = jsonraw[i][this._pval]))
						c[k]=jsonraw[i];
				}
				return c;
			}
		},
		_getObjectFromCache:function(key){
			if(this._cache){				
			
			  if(this._cache instanceof Array) {
				for(var i=0;i<this._cache.length;i++){
					if(this._cache[i].title===key){
						return _cache[i];						
					}
				}
			  } else {
				  return this._cache[key];
			  }
			  
			}
		},
		_callTip:function(text,val){
			//debugger
			var tooltipNode = L.DomUtil.create('div','rosreestr-search-tip'),
			obj=this._getObjectFromCache(text);		

			if(obj&&obj._sourceType){
				//debugger
				var html='';
				if(obj._sourceType=='rosreestr'){
					html=obj._getText?obj._getText():text;
				}
				if(obj._sourceType=='2gis'){
					html=text;
				}
				if(obj._sourceType=='yandex'){
					html=text;
				}
				if(obj._sourceType=='nominatim'){
					html=text;
				}     
						
				tooltipNode.innerHTML=html;
				obj._innerElement=tooltipNode;
			} 
			else        	
				tooltipNode.innerHTML = text;    

			return tooltipNode;
		},
		
		_extendWithoutCircular:function (){
						var dest=arguments.length>0?arguments[0]:{},i, j, len, src;

                        for (j = 1, len = arguments.length; j < len; j++) {
                            src = arguments[j];
                            for (i in src) {
								if(!(i.indexOf('_')==0||src[i] instanceof  Element||typeof src[i]=='function'))
									dest[i] = src[i];
                            }
                        }
                        return dest;
		},
		
		_search:function(text,fnCallback){
			var controlSearch = this,
				pkey =controlSearch._pkey,
				pval =controlSearch._pval,
				ptype=controlSearch._ptype;
			
			function createDeferred(){
				var result = $.Deferred();
				result.abort=function(){
						this.reject(rejectUserCancel());
				};
				return result;
			}

			function rejectNotFound(){
				return {code:'notfound'};
			}

			function rejectError(args){
				return $.extend({code:'error'},args&&args.length>0?{args:args}:{});
			}

			function rejectUserCancel(){
				return {code:'usercancel'};
			}

			function validateKadastrNo(s){
				return /^([\d\x20]+\:?){1,6}$/i.test(s);
			}

			
			function getJSON() {										
					return JSON.stringify(controlSearch._extendWithoutCircular({},this));
			}

			function findByKadastrNo(s){
				var urlQuery = 'http://maps.rosreestr.ru/arcgis/rest/services/Cadastre/CadastreSelected/MapServer/1/query?f=json&where=PKK_ID%20like%20%27'+s.replace(/\:/g,'')+'%25%27&&orderByFields=PKK_ID&outFields=*',
				result = createDeferred();

				function fnAlias(d,s,t){

					if(this._fieldAliases&&!s){
						s=this;
						d = s||d;
					}

					var alias={},
					fa=d&&(d.fieldAliases||d._fieldAliases||this._fieldAliases)?d.fieldAliases||d._fieldAliases||this._fieldAliases:(d&&t?d:null);
						

					if(s) {
						if(d&&(fa)){
							for(var a in fa){
								 if(fa.hasOwnProperty(a)){
									alias[fa[a]]=s[a];
								 }
							}
						}
						else 
							return s;
					}
					return alias;
				}

				function getText() {

					if(this._address&&this._address.OBJECT_ADDRESS&&L.Util.trim(this._address.OBJECT_ADDRESS).length>0)
						return this.CAD_NUM+' - '+this._address.OBJECT_ADDRESS;
						
					return this.CAD_NUM;
				}
								

				$.ajax(urlQuery,
				{
					dataType:'json',
					success:function(data,status,xhr){
						if(data.error)
						{               
						result.reject(rejectError(data.error));
						return;
						}

						var res=[],src,dst;
						for(var f=0;f<data.features.length;f++){
							src=data.features[f].attributes;
							dst={};
							dst[ptype]='rosreestr';
							//dst[pkey]=L.Projection.SphericalMercator.unproject(L.point(src.XC,src.YC).divideBy(L.Projection.Mercator.R_MAJOR));                 
							dst[pkey]=L.CRS.EPSG3857.unproject(L.point(src.XC,src.YC));
							dst[pval]=src.CAD_NUM;
							dst._mineKeys={XC:src.XC,YC:src.YC,CAD_NUM:src.CAD_NUM};
							$.extend(
									dst,
									{_fieldAliases:data.fieldAliases,_fnAlias:fnAlias,_getJSON:getJSON},
									src,
									{
									 _mine:function(){
											var self=this;
											if(self._mineKeys) {
												 if(self._mineKeys.XC&&self._mineKeys.YC)
												 $.ajax('http://maps.rosreestr.ru/arcgis/rest/services/Cadastre/TerrAgencies/MapServer/0/query?f=json&outFields=*&geometryType=esriGeometryPoint&geometry=%7B%22x%22%3A'+this.XC+'%2C%22y%22%3A'+this.YC+'%2C%22spatialReference%22%3A%7B%22wkid%22%3A102100%7D%7D',{dataType:'json'})
												 .then(function(data)
												 {      
													 if(data.error)
														 return;
													 
													 if(data.features.length>0){
														 self._services=[];
														 for(var f=0;f<data.features.length;f++){
															 var attr=data.features[f].attributes,
																 service = $.extend({ _fieldAliases:data.fieldAliases, _fnAlias:fnAlias,_getJSON:getJSON },attr);
																 self._services.push(service);
														 }
													 }                             
												 });
												 

											   if(self._mineKeys.CAD_NUM)                         
												 $.ajax('http://maps.rosreestr.ru/arcgis/rest/services/Cadastre/CadastreSelected/MapServer/exts/GKNServiceExtension/online/parcel/find?f=json&cadNum='+self._mineKeys.CAD_NUM,{dataType:'json'})
												 .then(function(data)
												 {                                      
													 if(data.error)
														 return;
													 
													 if(data.featuresCount>0) {                             
														 for(var f=0;f<data.features.length;f++){ 
															 var attr=data.features[f].attributes;
															 if(self._mineKeys.CAD_NUM===attr.CAD_NUM){                                        
																 $.extend(self,{ _address: $.extend({ _fieldAliases:data.fieldAliases, _fnAlias:fnAlias,_getJSON:getJSON},attr),_getText:getText});
																 if(self._innerElement&&self._innerElement.innerHTML){
																	 self._innerElement.innerHTML=self._getText();
																 }
																 break;
															 }
														 }
													 }
																				  
												 });                     
											}
										}	
									});                 
							res.push(dst);
							dst._mine();
						}
						
						if(res.length>0)                  
							result.resolve(res);             
						else   
							result.reject(rejectNotFound());             
					},
					error: function(xhr,status,exception){
						result.reject(rejectError(arguments));            
					}
				});      
				return result;
			}



			function findWithNominatim(s){
				var urlQuery='http://nominatim.openstreetmap.org/search?format=json&q='+s,
				result=createDeferred();                

				$.ajax(urlQuery,
					{ 
						dataType:'json',
						success: function(data,status,xhr){
							var res = [],i,s,d;

							for(i=0;i<data.length;i++){
								s=data[i];                    
								//if(d.type=='city') {
								d={_getJSON:getJSON};                 
								d[ptype]='nominatim';
								d[pkey]=L.latLng(s.lat,s.lon);
								d[pval]=s.display_name;
								res.push(d);
								//}
							}     
							
							if(res.length>0)
								result.resolve(res);
							else 
								result.reject(rejectNotFound());            
						},
						error: function(xhr,status,exception)
						{
							result.reject(rejectError(arguments));                    
						}
					}
				);
				return result;
			}

			//
			function findWithYandex(s){

				function result (){            
					var geocoding = createDeferred(),
					doIt = createDeferred();

					doIt.then(function(){
						var ymaps_ready = $.Deferred();
						ymaps.ready(function(){
							ymaps_ready.resolve()
						});
						return ymaps_ready;
					})
					.then(function ymapsReady(){                                    

							function callerFn(dataYandex){               
								var meta=dataYandex.metaData,
								objects=dataYandex.geoObjects,
								src,dst,res;
								
								if(meta.geocoder.results>0){
									res=[];                    
									for(var iObj=0;iObj<meta.geocoder.results;iObj++) {
										src = objects.get(iObj);
										if(src){
											dst = $.extend({_getJSON:getJSON},src.properties.getAll());// L.Util.extend({},src.properties.getAll());                        
											dst[ptype]='yandex';
											dst[pval]=src.properties.get('text');
											dst[pkey]=L.latLng(src.geometry.getCoordinates());                        
											res.push(dst);
										}
									}                         
									geocoding.resolve(res);
								}
								else                  
									geocoding.reject(rejectNotFound());						
							}

							function wGeocode(){
								(ymaps.geocode||arguments[0])(s,{results:50})
								.then(function(res){
								  callerFn(res)
								})                
							}                
							if(!ymaps.geocode)
								ymaps.modules.require('geocode',wGeocode)        
							else 
								wGeocode()						
						 },
						 function() {                    
								geocoding.reject(rejectError(arguments));
						 }
						 ); 

					doIt.resolve();
					return geocoding;
				}

				if(typeof ymaps==='undefined'){
					return $.ajax('http://api-maps.yandex.ru/2.1/?lang=ru_RU&load=geocode',{dataType: 'script'})
						   .then(result);
				}

				return result();
			}

			function findWith2GIS(s){
				var 
				apiKey ='rudcgu3317',
				urlQuery='http://catalog.api.2gis.ru/geo/search?version=1.3&key='+apiKey+'&q='+s,
				result=createDeferred();

				$.ajax(urlQuery,
				{ 
					dataType:'json',
					success: function(data,status,xhr){                        
							 if(data.error_code)
							 {
								 result.reject(rejectError(data));
								 return;
							 }
					  
							 if(data.total>0){                                 
								var res = [],i,s,d,c;
								for(i=0;i<data.result.length;i++){
									s=data.result[i];
									d=$.extend({_getJSON:getJSON},s);
									d[ptype]='2gis';									
									c=/^POINT\s*\(\s*(\d+(\.\d*){0,1})\s*(\d+(\.\d*){0,1})\s*\)$/i.exec(s.centroid);                                        
									d[pkey]=L.latLng(c[3],c[1]);
									d[pval]=s.name;
									
									res.push(d);                
								 }
								 result.resolve(res);
							 }
							 else 
								 result.reject(rejectNotFound());            
					},
					error: function(xhr,status,exception)
					{
						result.reject(rejectError(arguments));                    
					}
				}
				);
				return result;
			}

			function findByAddress(s){

				var result = createDeferred();
				result.fail(function(e){
						if(e&&e.code=='usercancel'){
						var testState = result.state();
						debugger
						}
				});

				findWith2GIS(s)
					.then(fnCallback,
					function(){

						if(result.state()=='rejected'){
							debugger
							fnCallback();
							return;
						}

						findWithYandex(s)
							.then(
								fnCallback,
								function(e){

								if(result.state()=='rejected'){
									debugger
									fnCallback();
									return;
								}

								findWithNominatim(s)
									.then(
											fnCallback,
											function(e){
												debugger
												fnCallback();
												controlSearch._cancel.style.display = 'none';
												controlSearch.options.autoCollapseTime=3000;
												
												if(e.code=='error') {
													debugger
													var xhr=e.args[0],state=e.args[1],exception=e.args[1];                    
													controlSearch.showAlert('Не нашлось ничего:'+''+exception+' ('+xhr.status+')');      
												} 
												if(e.code=='notfound')
													controlSearch.showAlert('Ничего не нашлось!!!');      
											}
									);          
								}
							)       
					}
				);     

				return result;
			}

/*
			if(text&&text.length<3){
				var result  = createDeferred();
				result.fail(function(e){
					if(e&&e.code=='usercancel'){
						var testState = result.state();
						debugger
					}
				});
				result.reject();
				return result;
			}
*/
			if(validateKadastrNo(text)) {
				var result=findByKadastrNo(text);
				result.then(
							fnCallback,            
							function(e){
								fnCallback();
								if(e.code=='error') 
								{
									if(e.args)
									{
										var error = e.args.length==1?e.args[0]:null,
											xhr,status,exception;
										
										if(e.args.length==3){
											xhr = e.args[0];
											status = e.args[1];
											exception = e.args[2];
										}
										
										controlSearch._cancel.style.display = 'none';
										controlSearch.options.autoCollapseTime=5000;
										
										if(xhr)                         
											controlSearch.showAlert('Росреестр присел:'+''+exception+' ('+xhr.status+')');
										
										if(error)                                                
											controlSearch.showAlert('Ошибка запроса:'+error.message+' ('+error.code+')');
									}
								}

								if(e.code=='notfound') {
									controlSearch._cancel.style.display = 'none';
									controlSearch.options.autoCollapseTime=3000;
									controlSearch.showAlert('Земельные участки не найдены!!!');
								}
							}
						);
				return result;
			}
			
			return findByAddress(text);
		}
    });

    L.Map.addInitHook(function () {
        if (this.options.Rosreestr) {
            this.rosreestrControl = L.control.rosreestr(this.options.Rosreestr);
            this.addControl(this.rosreestrControl);
        }
    });

    L.control.rosreestr=function(options){
        return nsControl.Rosreestr.create(options);
    }

}));