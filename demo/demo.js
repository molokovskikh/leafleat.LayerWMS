var urlWms= 'http://maps.kosmosnimki.ru/TileService.ashx/apikeyL5VW1QBBHJ';//'http://xs-msv:81/services/gis';

debugger


var saumi = 
//    new L.TileLayer.WMS//
//new L.wmsLayer
new L.tileLayer.wms.featureInfo
(urlWms, {
        layers: '04C9E7CE82C34172910ACDBF8F1DF49A',//,2gis,grounds',
        version:'1.3.0',        
        format: 'image/png',
        transparent: true,
        opacity:0.9,
        zIndex:101,
        //info_format: 'application/json',
		tiled:true,
		
        GetFeatureInfo:{                         
           /* ajax:function(url,type,success,error)
            {
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
          error(error);
      }
    });
            },*/
                        //propertyName: 'Title,Description,Layer'
            notFoundMessage:'Нет данных!'
            //,templateContent:'<h2>{Title}</h2><p>{Description}</p><p>{Layer}</p>'
            ,classGroup:'mygroup',classList:'mylist'
                    }    
    ,attribution:'Тестовый слой WMS с сервисом "Что здесь?"'
});

var testImage=new L.imageOverlay("https://stat.online.sberbank.ru/PhizIC-res/15.1/commonSkin/images/logoHeader.png",
new L.LatLngBounds(new L.LatLng(45.704553, 37.619781),new L.LatLng(55.794553, 49.919781))
//new L.LatLngBounds(new L.LatLng(44, -93),new L.LatLng(45.02, -92)),{animate:true}
);



map = new L.Map('map', {
        center: new L.LatLng(55.754553, 37.619781),
		//center: new L.LatLng(45, -93.2),
        layers: [testImage,saumi],
        zoom: 6,
        zoomControl: true,
		animate:true
});



testImage._map.on('moveend',function(){
	//debugger
	var c = this.getContainer();
	var pane = testImage.getPane();
	var cpos = L.DomUtil.getPosition(c);
	var panepos = L.DomUtil.getPosition(pane);
	debugger
});

testImage._map.on('zoomanim', function(center,zoom,scale,origin,offset){
	debugger
});



