var urlWms= //'http://maps.kosmosnimki.ru/TileService.ashx/apikeyL5VW1QBBHJ';
		    //'http://xs-msv:81/services/gis'
			'http://c.maps.rosreestr.ru/arcgis/rest/services/Cadastre/Cadastre/MapServer/export?';


var custom_fn = function(params){
			
			var p=
			{ 
				transparent:true,
				bbox:params.bbox,
				dpi:'96',
				f  :'image',
				format:'PNG32',
				bboxSR:'102100',
				imageSR:'102100',
				size:[params.width,params.height].join(',')
			};
			
			return p;
		};
	
var rosreestrLayer = new	L.wmsLayer('http://c.maps.rosreestr.ru/arcgis/rest/services/Cadastre/Cadastre/MapServer/export?',
{
	fn_custom:
	function(params){
			
			var p=
			{ 
				transparent:true,
				bbox:params.bbox,
				dpi:'96',
				f  :'image',
				format:'PNG32',
				bboxSR:'102100',
				imageSR:'102100',
				size:[params.width,params.height].join(',')
			};
			
			return p;
		},
	ignoreEmpty:true,
	proxy_url:'http://xs-msv:81/services/proxy',
	opacity:0.55,
	transparent:true
});


var saumi = 
//    new L.TileLayer.WMS//
//new L.wmsLayer
new L.tileLayer.wms.featureInfo
(urlWms, {
	     layers:'2gis,grounds,buildings,streets',
        //layers: '04C9E7CE82C34172910ACDBF8F1DF49A',
		//layers_alias:'Космоснимки',
        version:'1.3.0',        
        format: 'image/png',
        transparent: true,
        opacity:0.9,
        zIndex:101,
        //info_format: 'application/json',
		//gutter:0,
		fn_custom:  custom_fn,
		proxy_url:'http://xs-msv:81/services/proxy',
        GetFeatureInfo:{  
			/*ajax:function(url,type,success,error)
			{
				var context=this;
			require(["dojo/request"],function(request){
	

				request(url,{handleAs: 'json'})
				.then(function(data){    
					debugger
					success(data);	
				}, function(err){    
					debugger
					context._ajax_error(err,{load:success,handleAs: 'text'});
				}, function(evt){
					debugger
				});
			});	
				/*
				dojo.xhrGet({
					url: url,
					handleAs: 'text',					
					load: function(response, ioArgs){
						debugger
						success(response.data);
						return response;
					},					
					error: function(response, ioArgs){
						
						debugger
						context._ajax_error(response,this);
						return response;
					}
							});
							
			},
			*/
          /*  ajax:function(url,type,success,error)
            {
				var context=this;
				debugger
                  //Запросим данные
      $.ajax({
      url: url,
      type:type.Request,
      dataType:type.Data,
      success: function (data, status, xhr) {
          debugger
          success(data);
      },
      error: function (xhr, status, error) {
          debugger 
		  context._ajax_error(xhr,this);
          //error(error);
      }
    });
            } *,*/
                        //propertyName: 'Title,Description,Layer'
            notFoundMessage:'Нет данных!'
            //,templateContent:'<h2>{Title}</h2><p>{Description}</p><p>{Layer}</p>'
            ,classGroup:'mygroup',classList:'mylist'
                    }    
    ,attribution:'Тестовый слой WMS с сервисом "Что здесь?"'
});


var testImage=new L.imageOverlay("https://stat.online.sberbank.ru/PhizIC-res/15.1/commonSkin/images/logoHeader.png",
new L.LatLngBounds(new L.LatLng(45.704553, 37.619781),new L.LatLng(55.794553, 49.919781))
//new L.LatLngBounds(new L.LatLng(44, -93),new L.LatLng(45.02, -92))
,{animate:false}
);

/*
var h=800,w=1000,nh=780,nw=900;
var s =saumi._calcCorrectSize(w,h,nh,nw);
debugger
w= 3801;
h= 1926;
nw= 2048;
nh= 1926;
s =saumi._calcCorrectSize(w,h,nh,nw);
*/


var osmLayer = new L.TileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
var DGisLayer = new L.TileLayer('http://tile{s}.maps.2gis.ru/tiles?x={x}&y={y}&z={z}',{subdomains:[0,1,2,3,4,5]});
var yandexLayer = new L.Yandex();
var googleLayer = new L.Google('ROADMAP');


map = new L.Map('map', {
        center: new L.LatLng(55.754553, 37.619781),
		//center: new L.LatLng(45, -93.2),
        layers: [testImage],
        zoom: 6,
        zoomControl: true
		//,animate:false
});


var controlMap = L.control.layers(
{'2ГИС':DGisLayer, "Yandex":yandexLayer, "Google":googleLayer,'OSM':osmLayer},
{'Росреестр':rosreestrLayer}
);
controlMap.addTo(map);

DGisLayer.addTo(map);


//saumi.refreshControlLayers(controlMap);
//saumi.getLayers().add('04C9E7CE82C34172910ACDBF8F1DF49A','Космоснимки');
//saumi.getLayers().up('grounds');









