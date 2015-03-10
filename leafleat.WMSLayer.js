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
        this.L.WMSLayer = this.L.wmsLayer = factory(this.L);
    }
}(function (L) {

// Module object
var wmsLayer = L.TileLayer.WMS.FeatureInfo = L.TileLayer.WMS.extend({                  
    statics:{ create :function (url, options) {return new L.TileLayer.WMS.FeatureInfo(url, options);}},
    includes: L.Mixin.Events,    
    initialize: function(url,options){
    L.TileLayer.WMS.prototype.initialize.apply(this, arguments);
    this._initialize();
  },  
  onAdd: function(map){
    L.TileLayer.WMS.prototype.onAdd.call(this, map);    
    map.on('click',this._getFeatureInfoClick);   
  },
  onRemove: function(map){  
    L.TileLayer.WMS.prototype.onRemove.call(this, map);
    map.off('click',this._getFeatureInfoClick);
  },

  
    _initialize:function()
    {   
	
        var layer=this;
		layer._update_tiled=L.GridLayer.prototype._update;
		
		layer._update=function(){
			if(layer.options.tiled)
				layer._update_tiled();
			else
				layer._updateWMS();
		};
		this._getFeatureInfoClick=function(e) { layer._getFeatureInfo(e.latlng); }
    },	
	
	  _ajax:function ajax(url,type,success,error) {
    var context = this,
        request = new XMLHttpRequest(),
        typeData=type&&type.Data?type.Data:(type instanceof string&&(type.trim().toUpperCase()==='GET'||type.trim().toUpperCase()=='POST')?'text':type.trim().toLowerCase()),
        typeRequest=type&&type.Request?type.Request:(type instanceof string&&(type.trim().toUpperCase()==='GET'||type.trim().toUpperCase()=='POST')?type.toUpperCase():'GET');
        
    request.onreadystatechange = change;
    request.open(typeRequest, url);
    request.send();
        
    function change() {
        if (request.readyState === 4) {
            if (request.status === 200) {
                var data= request.responseText;
               if(typeData==='json'&&JSON&&JSON.parse)
               {
                   try{
                    data = JSON.parse(data);
                   }catch(e) 
                   {
                       error.call(context,e.toString());
                       return;
                   }
               }
                
                success.call(context,data);
                
            } else {
                error.call(context, "error");
            }
        }
    }
   },
	
	_updateWMS:function()
	{
		var layer = this;
							
			var overlay = L.imageOverlay(layer._getMapUrl(),layer._map.getBounds(), {'opacity': 0});			
			overlay.once('load', function()
			{
				if(layer._overlay)
				{					
					layer._overlay.removeLayer(layer._map);
					layer._overlay = null;
				}
				overlay.setOpacity(layer.options.opacity ? layer.options.opacity : 1);
				debugger
			}, layer);
			
			overlay.addTo(layer._map);
			
	},
	_getMapUrl:function()
	{		  
		 var 
		    layer=this, 
			map = layer._map,            
            crs= layer.options.crs||layer._crs||map.options.crs,
			size = map.getSize(),
            bounds = map.getBounds(),                      
			nw = crs.project(bounds.getNorthWest()),
			se = crs.project(bounds.getSouthEast());	
		
			var requestParams =L.extend(layer.wmsParams, {
        version: layer.options.version,
        format: layer.options.format,
        height: size.y,
        width: size.x,
        layers: layer.options.layers		
		}),
		wmsVersion = parseFloat(requestParams.version);
		
			requestParams.bbox = (wmsVersion >= 1.3 && crs === L.CRS.EPSG4326 ?  [se.y, nw.x, nw.y, se.x] : [nw.x, se.y, se.x, nw.y]).join(',');
			requestParams[wmsVersion >= 1.3?'crs':'srs']=crs.code;
			debugger
		return layer._url +L.Util.getParamString(requestParams, layer._url, this.options.uppercase);
	},
  
   _getFeatureInfo: function(latlng)
    {    
        var layer=this,
            params=layer.featureInfoParams,
            templateContent = params.templateContent,
            propertyName= params.propertyName,
            info_format=params.info_format||'text/html';

  //Если не указан шаблон, и есть указанные свойства, то сгенерируем шаблон на основании списка свойств
        if(!templateContent&&propertyName&&propertyName.length>0)
  {        
      templateContent = '';
      debugger
      var parts = propertyName.split(/,/);
      for (var p=0;p<parts.length;p++) 
          templateContent += '<p>{'+parts[p]+'}</p>';
  }

      //Если указан шаблон, то сменим формат ответа на JSON
       info_format=templateContent&&info_format!='application/json'?'application/json':info_format;        
        
        var map = layer._map,
            point = map.latLngToContainerPoint(latlng, map.getZoom()),
            crs= layer.options.crs||layer._crs||layer.wmsParams.crs||map.options.crs,
			size = map.getSize(),
            bounds = map.getBounds(),                      
			nw = crs.project(bounds.getNorthWest()),
			se = crs.project(bounds.getSouthEast());

    
    //Параметры запроса к WMS/GetFeatureInfo 
    var requestParams = {
        request: 'GetFeatureInfo',
        service: 'WMS',        
        styles: '',
        version: layer.wmsParams.version||layer.options.version,
        format: layer.wmsParams.format||layer.options.format,       
        height: size.y,
        width: size.x,
        layers: layer.wmsParams.layers||layer.options.layers,
        query_layers: layer.options.layers,
        info_format: info_format
    },
	wmsVersion = layer._wmsVersion||parseFloat(requestParams.version);	
	
	requestParams.bbox = (wmsVersion >= 1.3 && crs === L.CRS.EPSG4326 ?  [se.y, nw.x, nw.y, se.x] : [nw.x, se.y, se.x, nw.y]).join(',');
	requestParams[wmsVersion >= 1.3?'i':'x']=point.x;
	requestParams[wmsVersion >= 1.3?'j':'y']=point.y;
	requestParams[wmsVersion >= 1.3?'crs':'srs']=crs.code;
	   

    //До параметры стилей при генерации HTML
    if(info_format==='text/html')
    {
        if(params.classGroup) requestParams.classGroup=params.classGroup;
        if(params.classList) requestParams.classList=params.classList;          
    }

    //Ссылка на запрос информации к WMS        
    var urlFeatureInfo=layer._url + L.Util.getParamString(requestParams, layer._url, true);
       
        var showResult=function(data){
            var prepareTemplateData=function(src){
                var dst = {};               
                for(var p in src)
                    if(src.hasOwnProperty(p))
                    dst[p]= typeof src[p]==='undefined'||!src[p]?'':src[p];
                return dst;
            };
            
            if(typeof data != 'string')
            {
                var features = data&&data.features&&data.features.length>0?data.features:data;
                data=null;
                if(features instanceof Array&&templateContent)
                {                           
                      html='';
                      for(var f in features)
                      {              
                          var feature=features[f];
                          var templateData = prepareTemplateData(feature.properties?feature.properties:feature);                         
                          html = html+ '<div>'+L.Util.template(templateContent, templateData)+'</div>';
                      }
                      data=html;                      
                }
            }
            
            //Если данные пустые, то подставим сообщение об отсутствие данных
            data = !data||data.length==0?('<div>'+(params.notFoundMessage||'No found data!')+'</div>'):data;
            
            //Покажем баллун с информацией
             L.popup()
            .setLatLng(latlng)
            .setContent(data)
            .openOn(map);
        };
        
        var ajax=params.ajax||this._ajax;
        //Запросим данные
        ajax(
             urlFeatureInfo,
             {Request:'GET',Data:(requestParams.info_format==='application/json'?'json':'text')},
             function(data)
             {
                 showResult(data);
             },
             function(error){
             });              
    }
});

L.wmsLayer=function() { return L.WMSLayer.create.apply(this,arguments);};
L.tileLayer.wms.featureInfo=function() { return L.TileLayer.WMS.FeatureInfo.create.apply(this,arguments);};

return wmsLayer;

}));
