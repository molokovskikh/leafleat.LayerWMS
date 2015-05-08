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

	//Константы ТИПЫ ИСТОЧНИКОВ ДАННЫХ ДЛЯ ПОИСКА
	var SourceTypes={
			Rosreestr:'rosreestr', 
			DoubleGIS:'_2gis', 
			Yandex:'yandex', 
			Google:'google', 
			Nominatim:'nominatim'
		};
	
	//Запросы к сервису ПКК
	function RequestAjaxToRosreestr(){
		
		//Развернуть вложенные списки номеров в один массив
		function expandArrays(list){
				var result=[];
				for(var i=0;i<list.length;i++){				
					if(list[i] instanceof Array)
						result.concat(expandArrays(list[i]));
					else {
						if(result.indexOf(list[i])<0)
							result.push(list[i]);
					}	
				}
				return result;
			}
		
		//Получить параметры url кадастрового(ых) номера(ов)
		function getParamsCadNum(kadastrNoList){
			kadastrNoList=kadastrNoList||expandArrays(arguments);
			if(kadastrNoList&&kadastrNoList.length>0){
				if(kadastrNoList.length>1){
					var strKadastrNumbers='[';
					for(var k=0;k<kadastrNoList.length;k++){
						if(kadastrNoList[k] instanceof String&&this.validateParcel(kadastrNoList[k])) 
							strKadastrNumbers += (strKadastrNumbers.length>1?',':'')+'\''+kadastrNoList[k]+'\'';
					}
					strKadastrNumbers += ']';
					return 'cadNums='+strKadastrNumbers;
				} else 
					return 'cadNum='+kadastrNoList[0];
			}
		}
		
		//Базовый URL
		this._baseUrl = 'http://maps.rosreestr.ru/arcgis/rest/services/Cadastre/',
		
		this._ajax=function(u){
			return $.ajax(u,{dataType:'json'})
		},
		
		this.validateParcel=function(cadNum){
			return /^(\x20*\d{2}\x20*\:\x20*){2}\x20*\d+\x20*\:\x20*\d+\x20*$/i.test(cadNum);
		},
		
		//Поиск по кадастровому(ым) номеру(ам) или координате (локальной или географической)
		this.find=function(){
			var urlQuery = this._baseUrl,
				cadNumMask = arguments.length==1&&!this.validateParcel(arguments[0])?arguments[0]:null,
				latLng = cadNumMask&&((cadNumMask.lat&&cadNumMask.lng)||(cadNumMask.x&&cadNumMask.y))?cadNumMask:null;
			
			if(latLng){
				var point = latLng;
				if(point.lat&&point.lng)
					point = L.CRS.EPSG3857.project(point);
				
				urlQuery+='CadastreSelected/MapServer/1/query?f=json&outFields=*&geometryType=esriGeometryPoint&geometry={"x":'+point.x+',"y":'+point.y+',"spatialReference":{"wkid":102100}}';
			} else {								
				if(cadNumMask){
					urlQuery+='CadastreSelected/MapServer/1/query?f=json&where=PKK_ID%20like%20%27'+cadNumMask.replace(/[\x20\:]/g,'')+'%25%27&&orderByFields=PKK_ID&outFields=*';
				} else {				
					urlQuery+=
						'CadastreSelected/MapServer/exts/GKNServiceExtension/online/parcel/find?f=json&'+
						getParamsCadNum.apply(this,arguments);
				}
			}
			//Подфильтруем результат (если он есть)
			//, укажем, что полученная информация адресная, если поиск был по номеру земельного участка)
			return this._ajax(urlQuery)
				   .pipe(function(data){
					   if(!cadNumMask&&data){
						   data._ignoreAddress=true;
					   }
					   return data;
				   });
		},
		
		//Поиск адресной информации по кадастровому(ым) номеру(ам)
		this.addressByNumbers=function() {
			var urlQuery=this._baseUrl+'CadastreSelected/MapServer/exts/GKNServiceExtension/online/parcel/find?f=json&';
			urlQuery+=getParamsCadNum.apply(this,arguments);				
			return this._ajax(urlQuery);
		},
		
		//Поиск обслуживающих организации, земельный участок в этой точке
		this.services = function(point){
			var urlQuery=this._baseUrl;
			if(point){				
				//Если геокоординаты, то переведем в локальные
				if(point.lat&&point.lng){
					point = L.CRS.EPSG3857.project(point);
				}
				point.x=point.x||point.XC;
				point.y=point.y||point.YC;
				
				if(point.x&&point.y)
					urlQuery+='TerrAgencies/MapServer/0/query?f=json&outFields=*&geometryType=esriGeometryPoint&geometry=%7B%22x%22%3A'+point.x+'%2C%22y%22%3A'+point.y+'%2C%22spatialReference%22%3A%7B%22wkid%22%3A102100%7D%7D';
			}			
			return this._ajax(urlQuery);
		}
		
		return this;
	}
	
	
	
	
	//Балун на карте
	var FindPopup = L.Popup.extend({
		initialize: function (findControl,options) {
            L.Util.setOptions(this, options);
			L.Popup.prototype.initialize.call(this,this.options);
			this._findControl=findControl;
			this.on('contentupdate',
								function(){
									var content=$('.rosreestr-search-popup-content');
									if(content.length>0) {				
										var tabHeader = $('.nav-tabs',content),
											tabContent = $('.tab-content',content);
										
										if($('li',tabHeader).length==1)
											tabHeader.hide();
										
										$('li',tabHeader).click(function(e){
											var tab=$(this),
												joinContent=$('>div[data-type=\''+tab.attr('data-type')+'\']',tabContent);
											
											$('li',tabHeader).removeClass('active');
											$('>div',tabContent).removeClass('active');
											
											tab.addClass('active');
											joinContent.addClass('active');
										});
									}
							  }
				);		
		}
	});
	
	
	//Сформировать ключ для доступа к типизированному источником данных объекту кэша
	function getKeyPType(dst,ptype){
			return '_'+(dst[ptype]||'');
		}
	
	//Контрол поиска
    nsControl.Rosreestr = nsControl.Search.extend({
		
		statics:{ create :function (options) { return new nsControl.Rosreestr(options) }},
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
				textExpand:'Найти', //Текст на кнопке в развернутом состоянии
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
			this._pkkService = new RequestAjaxToRosreestr();
			this._popup = new FindPopup(this);			
        },
		
        onAdd:function(map){
            var container = nsControl.Search.prototype.onAdd.call(this,map);
			
			if(this._markerLoc){
				this._markerLoc.bindPopup(this._popup);
			}
			map.on('searchcomplete',function(e){
				debugger
			});
			
			var objSearch=this._search;
			map.on('wmsrefreshctrllayers',function(e){
				
				if(e.WMSLayer){				
					objSearch._wmsLayers=objSearch._wmsLayers||[];
					if(objSearch._wmsLayers.indexOf(e.WMSLayer)<0)
						objSearch._wmsLayers.push(e.WMSLayer);
				}
				//e.control,e.layers
				debugger
			});
			           
            this.on('search_locationfound',function(e){
                debugger
				var obj = this._getObjectFromCache(e.text);
				if(obj&&this._ptype in obj) {
					if(obj[this._ptype]==SourceTypes.Rosreestr){		
						map.fire('searchcomplete',{
							mapObjects: [
											{
												kadastrNo:obj.CAD_NUM,
												latLng:obj[this._pkey],
												attributesJSON: obj._getJSON?obj._getJSON():null
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
		showLocation:function(latlng, title){			
			var obj = this._getObjectFromCache(title),
				objTarget = this._getByType(obj),
				info = objTarget&&objTarget._getText?objTarget._getText():title;
			if(this._markerLoc){
				this._markerLoc.setPopupContent(this._buildContentPopup(obj));
			}
			return nsControl.Search.prototype.showLocation.call(this,latlng,info);
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

		//Получить объект по типу источника данных
		_getByType:function(dst,key,set){
			if(dst){			
				key=key||getKeyPType(dst,this._ptype);
				//return key in dst?dst[key]:{};
				return key in dst?dst[key]:(dst&&set&&(dst[key]={})?dst[key]:{});
			}
		},

		//Формирование контента для балуна
		_buildContentPopup:function(obj){			
			obj = obj instanceof String?this._getObjectFromCache(obj):obj;			
			var typeTarget=getKeyPType(obj,this._ptype).substr(1),
				objTarget = this._getByType(obj),
				html='<div class="rosreestr-search-popup-content"><ul class="nav nav-tabs">',
				content='<div class="tab-content">';

			//Получить описание сервиса по типу (используется для имен закладок)
			function descByType(t){
				
				//Если есть переназначенный обработчик в опциях, то используем его
				if(typeof this.options.descByType ==='function'){
					var result = typeof this.options.descByType(t);
					if(!$.isEmptyObject(result)&&L.Util.trim(result).length>0)
						return result;
				}
				
				if(t==SourceTypes.Rosreestr)
					return 'Росреестр';
				if(t==SourceTypes.DoubleGIS)
					return '2ГИС';
				if(t==SourceTypes.Yandex)
					return 'Яндекс';
				if(t==SourceTypes.Google)
					return 'Google';
				if(t==SourceTypes.Nominatim)
					return 'Nominatim';
				
				
			}
				
			//Создание контента по типу источника данных
			function buildByType(t,m){
				var result;
				
				//Если есть переназначенный обработчик в опциях, то используем его
				if(typeof this.options.buildByType==='function') {				
					result = this.options.buildByType(typeCur,model);
					if(!$.isEmptyObject(result)&&L.Util.trim(result).length>0)
						return result;
				}
				
				result=result||'';
				debugger
				if(t==SourceTypes.DoubleGIS){
					result+=L.Util.template('<div>{name}</div>',m);
				}
				
				if(t==SourceTypes.Rosreestr){
					if(m.address)
						result+=L.Util.template('<div>{OBJECT_ADDRESS}</div>',m.address);
					result+=L.Util.template('<div>{CAD_NUM}</div>',m);
				}
				return result;
			}
			
			//Обход всех зарегистрированных типов источников
			for(var st in SourceTypes){
				
				var typeCur = SourceTypes[st],
					nameTab = descByType.call(this,SourceTypes[st]),
					model = this._getByType(obj,'_'+typeCur),
					contentTab = buildByType.call(this,typeCur,model);
								
				if(contentTab&&L.Util.trim(contentTab).length>0){
					html+='<li'+(typeCur===typeTarget?' class="active"':'')+' data-type="'+typeCur+'"><a>'+nameTab+'</a></li>';
					content+='<div'+(typeCur===typeTarget?'  class="active"':'')+' data-type="'+typeCur+'">'+ contentTab +'</div>';
				}				
			}
		     						
			html+='</ul>'+content+'</div></div>';
					
				
				
			return html;
		},
		
		//Создание элемента выпадающего списка
		_callTip:function(text,val){
			
			var tooltipNode = L.DomUtil.create('div','rosreestr-search-tip'),
			obj=this._getObjectFromCache(text);		
			
			
			if(obj&&obj._sourceType){
				
				var html='';
					
				if(obj[this._ptype]==SourceTypes.Rosreestr){					
					var objTarget=this._getByType.call(this,obj);
					html=objTarget._getText?objTarget._getText():text;					
				}
				if(obj[this._ptype]==SourceTypes.DoubleGIS){
					html=text;
				}
				if(obj[this._ptype]==SourceTypes.Yandex){
					html=text;
				}
				if(obj[this._ptype]==SourceTypes.Nominatim){
					html=text;
				}     
						
				tooltipNode.innerHTML=html;
				obj._innerElement=tooltipNode;
			} 
			else        	
				tooltipNode.innerHTML = text;    

			return tooltipNode;
		},
		
		//Расширить объект таким образом, чтобы при сериализации он не имел цикличных узлов (обычно это сслыки на DOMElement)
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
		
		//Поиск запрошенных данных
		_search:function(text,fnCallback){
			
			var controlSearch = this,				
				pkey =controlSearch._pkey,
				pval =controlSearch._pval,
				ptype=controlSearch._ptype,
				wmsLayers = controlSearch._search._wmsLayers||(controlSearch._search._wmsLayers=[]);
			
				//Определение WMS слоя
			function detectWmsLayer(layer){				
				var wmsLayer=layer instanceof L.WMSLayer?layer:(typeof layer.getWMSLayer==='function'?layer.getWMSLayer():null);					
				if(wmsLayer
					&&(
						 (!controlSearch.options.allWmsLayers&&!$.isEmptyObject(wmsLayer.options.layers)&&!wmsLayer._layers._isEmpty)
					   ||(controlSearch.options.allWmsLayers&&!$.isEmptyObject(wmsLayer.defaultWmsParams.layers)&&L.Util.trim(wmsLayer.defaultWmsParams.layers).length>0)
					)
				) {
					if(wmsLayers.indexOf(wmsLayer)<0)
						wmsLayers.push(wmsLayer);						
				}
			}
			
			//Поиск слоев WMS
			if(controlSearch._map) {			
				controlSearch._map.eachLayer(function (layer) {
					detectWmsLayer(layer);
				});				
			}
			
			//Создание типов источников из коллекции WmsLayers
			for(var wl=0;wl<wmsLayers.length;wl++){
				var wmsSourceType = wmsLayers[wl].name||wmsLayers[wl]._url||('wmsLayerSourceType_'+wl);
				wmsSourceType=/^\d/i.test(wmsSourceType)?'_'+wmsSourceType:wmsSourceType;
				if(!(wmsSourceType in SourceTypes)){
					SourceTypes[wmsSourceType]=wmsSourceType;
				}
			}
			
			
			//Создание обещания с реализацией функции отмены abort, для "Выброса" из UI
			function createDeferred(){
				var result = $.Deferred();
				result.abort=function(){
					this.reject(rejectUserCancel());
				};
				return result;
			}

			//"Выброс" с кодом "Не найдено"
			function rejectNotFound(){
				return {code:'notfound'};
			}

			//"Выброс" с кодом "Ошибка"
			function rejectError(args){
				return $.extend({code:'error'},args&&args.length>0?{args:args}:{});
			}

			//"Выброс" с кодом "Отменено пользователем"
			function rejectUserCancel(){
				return {code:'usercancel'};
			}

			//Проверка значения на формат кадастрового номера
			function validateKadastrNo(s){
				return /^([\d\x20]+\:?){1,6}$/i.test(s);
			}

			//Получить строку объекта в формате JSON
			function getJSON() {
				var root = controlSearch._extendWithoutCircular({},this);										
				for(var st in SourceTypes){
					var obj = controlSearch._getByType(this,'_'+SourceTypes[st]);
					if(!$.isEmptyObject(obj)){
						var merger,
							child = controlSearch._extendWithoutCircular({},obj);
							if(!$.isEmptyObject(child)){
								merger={};
								merger['_'+st.toUpperCase()+'_']=child;
								$.extend(root,merger);
							}						
					}
				}
				return JSON.stringify(root);
			}
			
		
			
			
			//Получить сервис ПКК
			function getPkkService(){
				return controlSearch._pkkService;
			}
						
			//Получить объект по типу источника данных
			function getByType(dst,key,set) {
				key=key||getKeyPType(dst,ptype);
				return key in dst?dst[key]:(dst&&set&&(dst[key]={})?dst[key]:{});
			}
			
			//Скопировать данные в объект по типу источника данных (можно указать конкретный тип источника [опционально])
			function extendByType(dst,data,sourceType){
				return $.extend(getByType(dst,sourceType,true),data);
			}

			
			
			
			//Поиск по кадастровому номеру
			function findByKadastrNo(query){
				
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

					if(this.address&&this.address.OBJECT_ADDRESS&&L.Util.trim(this.address.OBJECT_ADDRESS).length>0)
						return (this.CAD_NUM||this.address.CAD_NUM)+' - '+this.address.OBJECT_ADDRESS;
						
					return this.CAD_NUM||this.address.CAD_NUM;
				}
								
				getPkkService().find(query)				
				.then(
					function(data,status,xhr){
						
						if(data.error)
						{               
							result.reject(rejectError(data.error));
							return;
						}
						
						if(data.features) {
							var res=[],src,dst;
							for(var f=0;f<data.features.length;f++){
								src=data.features[f].attributes;
								dst={};
								dst[ptype]=SourceTypes.Rosreestr;
								//dst[pkey]=L.Projection.SphericalMercator.unproject(L.point(src.XC,src.YC).divideBy(L.Projection.Mercator.R_MAJOR));                 
								dst[pkey]=L.CRS.EPSG3857.unproject(L.point(src.XC,src.YC));
								dst[pval]=src.CAD_NUM;
																
								dst._mineKeys={XC:src.XC,YC:src.YC,CAD_NUM:src.CAD_NUM};
																
								$.extend(
										dst,
										{
											_fieldAliases:data.fieldAliases,
											_fnAlias:fnAlias,
											_getJSON:getJSON,
											_mine:function (){
												var self=this,
													deferredServices=createDeferred(),
													deferredAddress=createDeferred();
												
												self._mine._deferred=$.when(deferredAddress,deferredServices);
												
												if(self._mineKeys) {
													 if(self._mineKeys.XC&&self._mineKeys.YC)
													 getPkkService().services({x:self._mineKeys.XC,y:self._mineKeys.YC})																									 
													 .then(function(data)
													 {      
														 if(data.error)
														 {		
															 deferredServices.resolve();
															 return;
														 }
														 
														 if(data.features.length>0){
															 var services=[];
															 for(var f=0;f<data.features.length;f++){
																 var attr=data.features[f].attributes,
																	 service = $.extend({ _fieldAliases:data.fieldAliases, _fnAlias:fnAlias,_getJSON:getJSON },attr);
																	 services.push(service);
															 }
															 getByType(self).services=services;
															 deferredServices.resolve(self);
														 } 
														deferredServices.resolve();
													 }
													 ,function() { deferredServices.resolve() });
													 

												   if(self._mineKeys.CAD_NUM)
													  getPkkService().addressByNumbers(self._mineKeys.CAD_NUM)													 
													 .then(function(data)
													 {                                      
														 if(data.error){
															deferredAddress.resolve();
															return;
														 }
														 
														 if(data.featuresCount>0) {
															 for(var f=0;f<data.features.length;f++){ 
																 var attr=data.features[f].attributes;
																 if(self._mineKeys.CAD_NUM===attr.CAD_NUM){                                        
																	 $.extend(getByType(self),
																				   { 
																					 address: $.extend({ _fieldAliases:data.fieldAliases, _fnAlias:fnAlias, _getJSON:getJSON },attr),
																					 _getText:getText
																				   }
																			  );
																	 if(self._innerElement&&self._innerElement.innerHTML){
																		 self._innerElement.innerHTML=getByType(self)._getText();
																	 }															
																	 deferredAddress.resolve(self);																	 
																	 break;
																}
															 }
														 }
														 
														 deferredAddress.resolve();
													 },
													 function() { deferredAddress.resolve() });
												}
											}	
										});   

								
								if(data._ignoreAddress){
									dst._mineKeys.CAD_NUM=null;
									extendByType(dst,{address:src,_getText:getText});
								} else
									extendByType(dst,src);
								
								res.push(dst);
								dst._mine();
							}
							if(res.length>0)                  
								result.resolve(res);             
							else   
								result.reject(rejectNotFound()); 
						}
						else   
							result.reject(rejectNotFound());      
						
					},
					function(xhr,status,exception){
						result.reject(rejectError(arguments));            
					}
				);
				return result;
			}



			//Поиск с использованием сервис-агрегатора Nominatim
			function findWithNominatim(query){
				var urlQuery='http://nominatim.openstreetmap.org/search?format=json&q='+query,
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
								d[ptype]=SourceTypes.Nominatim;
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

			//Поиск с использованием геокодера Яндекса
			function findWithYandex(query){

			    //Ожидает готовности API Яндекс и выполняет поиск
				function result (){  
					//Наобещаем в три короба ))
					var geocoding = createDeferred(),
					doIt = createDeferred();

					doIt.then(function(){
						//Создадим обещание, что как только функционал API Яндекса будет готов 
						//и все необходимые модули (geocode) будут проинициализированы
						//мы приступим к поиску, (переход по цепочке обещаний, согласно подписке)
						var ymaps_ready = $.Deferred();
						ymaps.ready(function(){
							ymaps_ready.resolve()
						});
						
						//Я не знаю какие гарантии дает ymaps.ready, 
						//но предположу, что оно не отработает, в случае провала,
						//поэтому поставим таймер, для проверки интересующего нас функционала Яндекс (geocode)
						//скажем так на 20 секунд, уж точно должен за это время всё подгрузить
						setTimeout(function(){
							if(!ymaps.geocode){								
								ymaps_ready.reject(rejectError('Время ожидания готовности API Яндекс истекло. API Яндекс - не загружено!'));
							}
						},20000);
						return ymaps_ready;
					})
					.then(function ymapsReady(){                                    

							//Обрабатывает результаты поиска
							function callerFn(dataYandex){               
								var meta=dataYandex.metaData,
								objects=dataYandex.geoObjects,
								src,dst,res;
								
								if(meta.geocoder.results>0){
									res=[];                    
									for(var iObj=0;iObj<meta.geocoder.results;iObj++) {
										src = objects.get(iObj);
										if(src){
											dst = {_getJSON:getJSON};
											dst[ptype]=SourceTypes.Yandex;
											dst[pval]=src.properties.get('text');
											dst[pkey]=L.latLng(src.geometry.getCoordinates());                        
											extendByType(dst,src.properties.getAll());
											res.push(dst);
										}
									}                         
									geocoding.resolve(res);
								}
								else                  
									geocoding.reject(rejectNotFound());						
							}

							//Запрос к сервису геокодинга (собственно сам поиск, тоже асинхронный)
							//По окончанию поиска будет вызвана функция обработки результатов callerFn
							function wGeocode(){
								(ymaps.geocode||arguments[0])(query,{results:50})
								.then(function(res){
								  callerFn(res)
								})                
							}   

							//Если по каким то причинам модуль geocode, не загружен, то запросим его снова
							if(!ymaps.geocode)
								ymaps.modules.require('geocode',wGeocode)
							else 
								wGeocode()						
						 },
						 function() {
								//Контекст обработки ошибки загрузки API Яндекс
								//Здесь имеет место ситуация, когда функционал API Яндекс не готов к работе
								//Перенаправим ошибку в контекст вызова
								geocoding.reject(rejectError(arguments));
						 }
						 ); 
					
					//Выполнить обещание поиска
					doIt.resolve();
					return geocoding;
				}

				//Подгрузим API Яндекса, если это еще не сделано, в случае успеха перейдем к поиску
				if(typeof ymaps==='undefined'){
					return $.ajax('http://api-maps.yandex.ru/2.1/?lang=ru_RU&load=geocode',{dataType: 'script'})
						   .then(result);
				}
				
				//Иначе выполним сразу поиск
				return result();
			}

			//Поиск с использованием геокодера 2ГИС
			function findWith2GIS(query){
				var 
				apiKey ='rudcgu3317',
				urlQuery='http://catalog.api.2gis.ru/geo/search?version=1.3&key='+apiKey+'&q='+query,
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
									d={_getJSON:getJSON};
									d[ptype]=SourceTypes.DoubleGIS;									
									c=/^POINT\s*\(\s*(\d+(\.\d*){0,1})\s*(\d+(\.\d*){0,1})\s*\)$/i.exec(s.centroid);                                        
									d[pkey]=L.latLng(c[3],c[1]);
									d[pval]=s.name;
									extendByType(d,s);
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

			
			//Поиск по ключевому слову
			function findByAddress(query){

				var result = createDeferred(),
					fnWrapPkk=function(data){
						fnCallback(data);						
						
						//"Подтягивает" к объекту информацию из ПКК и внутренних WMS-сервисов
						function dataItemJoin(dataItem) {							
							var latLng = dataItem[pkey];							
							
							//Обращение к ПКК
							findByKadastrNo(latLng)
							.then(function(pkk){
								if(pkk&&pkk instanceof Array&&pkk.length>0) {																	
									pkk[0]._mine._deferred.done(function(s,a){
										var o =s||a||pkk[0];
										if(o){											
											var mixed ={};
											mixed[getKeyPType(o,ptype)]=getByType(o);											
											$.extend(dataItem,mixed);
										}										
									});
								}								
							});

							//Обращение к доступным WMS-сервисам
							for(var wl=0;wl<wmsLayers.length;wl++){
								
								findByWmsLayer(latLng,wmsLayers[wl])
								.then(function(o){									
										if(o&&!(o instanceof String)){
											var mixed ={};
											mixed[getKeyPType(o,ptype)]=getByType(o);											
											$.extend(dataItem,mixed);
										}	
								})
							}
						}
						
						//Обход всех найденных объектов
						if(data&&data.length>0) {
							for(var i=0;i<data.length;i++){
								dataItemJoin(data[i]);
							}
						}						
					};
					
				result.fail(function(e){
						if(e&&e.code=='usercancel'){
						var testState = result.state();
						debugger
						}
				});

				
				findWith2GIS(query)
					.then(fnWrapPkk,
					function(){

						if(result.state()=='rejected'){
							debugger
							fnCallback();
							return;
						}

						findWithYandex(query)
							.then(
								fnWrapPkk,
								function(e){

								if(result.state()=='rejected'){
									debugger
									fnCallback();
									return;
								}

								findWithNominatim(query)
									.then(
											fnWrapPkk,
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


			//Поиск данных в сервисе WMS, в указанной координате
			function findByWmsLayer(latlng,wmsLayer){
				var result = createDeferred();
					params = wmsLayer.featureInfoOptions,
					ignore = params.ignore;
					
				if(ignore) {				
					result.reject(rejectNotFound());
				} else {
					if(wmsLayer._getFeatureInfo){
						
						//var strLayersOld = wmsLayer.defaultWmsParams.layers,
						//	strLayers = strLayersOld;
						
						var strLayers;
						
						if(wmsLayer._layers._isEmpty&&controlSearch.options.allWmsLayers){
							var ls=[];							
							$.each(wmsLayer._layers._listLayers,function(i,e){
								ls.push(e.name);								
							});
							strLayers = ls.join(',');
							//wmsLayer.defaultWmsParams.layers=strLayers;
						}
						
						wmsLayer._getFeatureInfo.call(wmsLayer,latlng,function(data,error){
							//wmsLayer.defaultWmsParams.layers = strLayersOld;
							if(data&&typeof data!=='string'){
								result.resolve(data);
							} else {
								result.reject(rejectError(error||data));
							}
						},
						controlSearch._map,
						strLayers);
						
					} else
						result.reject(rejectNotFound());					
				}				
				return result;
			}
			
			
			//Проверка на кадастровый номер
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