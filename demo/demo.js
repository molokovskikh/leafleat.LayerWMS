var urlWms='http://xs-msv:81/services/gis';

debugger


var saumi = 
//    new L.TileLayer.WMS//
//new L.wmsLayer
new L.tileLayer.wms.featureInfo
(urlWms, {
        layers: '2gis,grounds',
        version:'1.3.0',        
        format: 'image/png',
        transparent: true,
        opacity:0.9,
        zIndex:101,
        //info_format: 'application/json',
		tiled:true,
        featureInfo:{                         
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
            notFoundMessage:'Нет данных!',
            templateContent:'<h2>{Title}</h2><p>{Description}</p><p>{Layer}</p>'
            ,classGroup:'mygroup',classList:'mylist'
                    }    
    ,attribution:'Тестовый слой WMS с сервисом "Что здесь?"'
});




map = new L.Map('map', {
        center: new L.LatLng(55.754553, 37.619781),
        layers: [saumi],
        zoom: 9,       
        zoomControl: true
});
