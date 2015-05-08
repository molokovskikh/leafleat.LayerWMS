var urlWms= //'http://maps.kosmosnimki.ru/TileService.ashx/apikeyL5VW1QBBHJ';
		    'http://xs-msv:81/services/gis';


var 

 loading = function(end)
 {
	if(this._map)
	{
		
		var context_fn = arguments.callee,
			q = context_fn.query||[],
			c   = this._map.getContainer(),
			sc  = c.style.cursor||'default',
			scs = !end?'progress':'default',
			i;
		
		context_fn.query=q;
		
		if(!end){
			if(q.indexOf(this)<0)
				q.push(this)
		}
		else {
			if((i=q.indexOf(this))>=0)			
				q.splice(i,1)			
		}
		
		if(sc!=scs)
		{			
			if((end&&q.length==0)||!end)			
				c.style.cursor = scs;
		}
	}
 },
	saumi = 
    new L.WMSLayer(urlWms, {		
		loading:loading,
	    layers:'2gis,grounds,buildings,streets',
        version:'1.3.0',        
        format: 'image/png',
        transparent: true,
        opacity:0.9,
        //zIndex:101,
        //info_format: 'application/json',
		//fadeTime:2000,
		//gutter:0,		
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
    //,attribution:'Тестовый слой WMS с сервисом "Что здесь?"'
});
			
			

var rosreestrLayer = new L.wmsLayer('http://c.maps.rosreestr.ru/arcgis/rest/services/Cadastre/Cadastre/MapServer/export?',
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
	//fadeTime:1000,
	//ignoreEmpty:true,
	ignoreFeatureInfo:true,
	proxy_url:'http://xs-msv:81/services/proxy',
	opacity:0.55,
	transparent:true
});


var testImage=new L.imageOverlay("https://stat.online.sberbank.ru/PhizIC-res/15.1/commonSkin/images/logoHeader.png",
new L.LatLngBounds(new L.LatLng(45.704553, 37.619781),new L.LatLng(55.794553, 49.919781))
//new L.LatLngBounds(new L.LatLng(44, -93),new L.LatLng(45.02, -92))
,{animate:false}
);


map = new L.Map('map', {
        center: new L.LatLng(55.754553, 37.619781),
		//center: new L.LatLng(45, -93.2),
        //layers: [testImage],
        zoom: 6,
        zoomControl: true,
		 Rosreestr:{
			zoom:14,
			markerLocation:true,
			allWmsLayers:true
        }
		//,animate:false
		,attributionControl:false
});


var controlMapBase = 
 L.control.layers(
{
 '2ГИС':L.TileLayer.DGis.create(null,{subdomains:[0,1,2]}).addTo(map), 
 'Яндекс':L.TileLayer.Yandex.create(), 
 'Google':L.TileLayer.Google.create(),
 'OpenStreetMap':L.TileLayer.Osm.create(),
 'Космоснимки':L.TileLayer.Kosmosnimki.create()  
 }
,{'Росреестр':rosreestrLayer}
)
.addTo(map);/*,

	l=L.WMSLayer.create('http://maps.kosmosnimki.ru/TileService.ashx/apikey=L5VW1QBBHJ',{loading:loading}),
	layersKosmo = l
	.addTo(map);
	.refreshControlLayers(controlMapBase)
	.getLayers();
*/
window._tester = {
	r:rosreestrLayer,
	m:map,
	//k:l,
	s:saumi
};

//layersKosmo.add('04C9E7CE82C34172910ACDBF8F1DF49A','Космоснимки',true);

//l.name='Космоснимки';
saumi.name='Сауми';

var controlMap = L.control.layers().addTo(map);
saumi.refreshControlLayers(controlMap);
saumi.refreshControlLayers(controlMap);


//
//saumi.getLayers().up('grounds');









