var settings = {
  'category':'all',
  'day':'Wed',
  'hour':12,
  'color_by_places':true,
  'color_column':'wed_12',
  'height_factor':10,
  'comfort_chosen':'perc_comfort_summer',
  'pluto_chosen':'RetailArea',
  'storyItem':0
}

var cmaps = {
  'red2green': ['#d73027','#fc8d59','#fee08b','#d9ef8b','#91cf60','#1a9850'],
  'blue2yellow': ['#151224','#343D5E','#4F777E','#709E87','#99BE95','#D6DEBF'],
  'white2red': ['#ffffff','#ff8984','#de2d26','#a50f15','#771118','#560A10'],
  'red2white2green': ['#ca0020','#f4a582','#ffffff','#a6d96a','#1a9641'],
  'pinks': ['#feebe2','#fbb4b9','#f768a1','#c51b8a','#7a0177']
}

var columnTitles = {
  'comfort': {
    'perc_comfort_summer':'% of Time in Comfort (Summer)',
    'perc_stress_summer':'% of Time in Stress (Summer)',
    'perc_comfort_winter':'% of Time in Comfort (Winter)',
    'perc_stress_winter':'% of Time in Stress (Winter)'
  }
}

mapboxgl.accessToken = 'pk.eyJ1IjoiZGNoYXJ2ZXkiLCJhIjoiY2ltemVpNjY1MDRlanVya2szYzlnM2dxcyJ9.im9EDlP7YIYefEt_wz2fww';

var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/dcharvey/cjbpm8opy70gz2rskhcwuwz4r',
    center: [-73.9859,40.6906],
    zoom: 16,
    pitch: 60
});

// converts from WGS84 Longitude, Latitude into a unit vector anchor at the top left as needed for GL JS custom layers
var fromLL = function (lon,lat) {
    // derived from https://gist.github.com/springmeyer/871897
    var extent = 20037508.34;

    var x = lon * extent / 180;
    var y = Math.log(Math.tan((90 + lat) * Math.PI / 360)) / (Math.PI / 180);
    y = y * extent / 180;

    return [(x + extent) / (2 * extent), 1 - ((y + extent) / (2 * extent))];
}

// moves the 3d object from 0,0 to these coordinates
var translate = fromLL(-73.983610,40.690114);

var transform = {
    translateX: translate[0],
    translateY: translate[1],
    translateZ: 0,
    rotateX: Math.PI / 2,
    rotateY: 0,
    rotateZ: 0,
    scale: 1e-8
    // scale: 5.41843220338983e-8
}

const THREE = window.THREE;

class CustomLayer {
    constructor() {
        this.id = 'custom_layer';
        this.type = 'custom';

        this.camera = new THREE.Camera();
        this.scene = new THREE.Scene();

        const light = new THREE.AmbientLight( 0x404040, 3 ); // soft white light
        this.scene.add( light );

        const directionalLight = new THREE.DirectionalLight(0xffffff, .8 );
        directionalLight.position.set(1, 4, 4);
        // directionalLight.castShadow = true;
        // directionalLight.shadowCameraVisible = true;
        this.scene.add(directionalLight);

        // var helper = new THREE.DirectionalLightHelper( directionalLight, 1 );
        // this.scene.add( helper );

        const directionalLight2 = new THREE.DirectionalLight(0xffffff, .5 );
        directionalLight2.position.set(-100, 0, -400);
        this.scene.add(directionalLight2);

        // var helper2 = new THREE.DirectionalLightHelper( directionalLight2, 1 );
        // this.scene.add( helper2 );

        var self = this

        var mat1 = new THREE.MeshStandardMaterial( {color:0xffffff, roughness:1, side:THREE.DoubleSide} );
        var mat2 = new THREE.MeshStandardMaterial( {color:0xff9e86, roughness:1, side:THREE.DoubleSide} );
        var mat3 = new THREE.MeshStandardMaterial( {color:0xe1f0f4, roughness:1, side:THREE.DoubleSide} );
        var mat4 = new THREE.MeshStandardMaterial( {color:0xffe886, roughness:1, side:THREE.DoubleSide} );

        objLoader('BK_Existing.obj', 'existing', mat1, true)
        objLoader('BK_Demo.obj', 'demo', mat2, false)
        objLoader('BK_Recent.obj', 'recent', mat3, true)
        objLoader('BK_Future.obj', 'future', mat4, false)

        // load the models
        function objLoader (path, name, material, visibility) {

          // instantiate the loader
          var loader = new THREE.OBJLoader2();

          // function called on successful load
          var callbackOnLoad = function ( event ) {
            var group = event.detail.loaderRootNode
            group.name = name;

            group.traverse(function(object) {
              object.castShadow = true;
              // object.receiveShadow = true;
              object.material = material;
            });

            group.traverse ( function (object) {
                if (object instanceof THREE.Mesh) {
                    object.visible = visibility;
                }
            });

            self.scene.add( event.detail.loaderRootNode );
          };

          // load a resource from provided URL synchronously
          loader.setPath( '3d/' );
          loader.setLogging( false, false );
          loader.load( path, callbackOnLoad, null, null, null, false );
        }

    }

    onAdd(map, gl) {
        this.map = map;

        this.renderer = new THREE.WebGLRenderer({
            canvas: map.getCanvas(),
            context: gl,
        });


        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap
    }

    render3D(gl, matrix) {
        const rotationX = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(1, 0, 0), transform.rotateX);
        const rotationY = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(0, 1, 0), transform.rotateY);
        const rotationZ = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(0, 0, 1), transform.rotateZ);

        const m = new THREE.Matrix4().fromArray(matrix);
        const l = new THREE.Matrix4().makeTranslation(transform.translateX, transform.translateY, transform.translateZ)
            .scale(new THREE.Vector3(transform.scale, -transform.scale, transform.scale))
            .multiply(rotationX)
            .multiply(rotationY)
            .multiply(rotationZ);

        this.camera.projectionMatrix.elements = matrix;
        this.camera.projectionMatrix = m.multiply(l);
        this.renderer.state.reset();
        this.renderer.render(this.scene, this.camera);
        this.renderer.autoClear = true;
        this.renderer.shadowMap.enabled = true;
        this.map.triggerRepaint();
    }

}

map.on('load', function() {
    // map.addLayer({
    //     'id': '3d-buildings',
    //     'source': 'composite',
    //     'source-layer': 'building',
    //     'filter': ['==', 'extrude', 'true'],
    //     'type': 'fill-extrusion',
    //     'minzoom': 15,
    //     'paint': {
    //         'fill-extrusion-color': '#ccc',
    //         'fill-extrusion-height': ["get", "height"]
    //     }
    // });

    var layers = map.getStyle().layers;
    var labelLayerId;
    for (var i = 0; i < layers.length; i++) {
        if (layers[i].type === 'symbol' && layers[i].layout['text-field']) {
            labelLayerId = layers[i].id;
            break;
        }
    }

    map.addLayer({
      'id': 'comfort',
      'type': 'fill',
      'source': {
        'type': 'geojson',
        'data': './data/comfort_summer_winter.geojson'
      },
      'layout': {
            'visibility': 'none'
        },
      'paint': {
          'fill-color': [
              'interpolate',
              ['linear'],
              ['number', ['get', 'perc_comfort_summer']],
              50, cmaps.red2green[0],
              60, cmaps.red2green[1],
              70, cmaps.red2green[2],
              80, cmaps.red2green[3],
              90, cmaps.red2green[4],
              100, cmaps.red2green[5]
          ],
          'fill-opacity': 0.8
      }
    }, labelLayerId);

    map.addLayer({
      'id': 'pluto',
      'type': 'fill',
      'source': {
        'type': 'geojson',
        'data': './data/MapPLUTO_Downtown_BK.geojson'
      },
      'layout': {
            'visibility': 'none'
        },
      'paint': {
          'fill-color': [
              'interpolate',
              ['linear'],
              ['number', ['get', 'RetailArea']],
              0, cmaps.pinks[0],
              5000, cmaps.pinks[1],
              10000, cmaps.pinks[2],
              15000, cmaps.pinks[3],
              20000, cmaps.pinks[4]
          ],
          'fill-opacity': 0.8
      }
    }, labelLayerId);

    map.addLayer({
        "id": "survey",
        "type": "circle",
        "source": {
            "type": "geojson",
            'data': './data/public_life_survey.geojson'
        },
        'layout': {
            'visibility': 'none'
        },
        'paint': {
          'circle-color': '#5dafe2',
          'circle-radius': [
              "interpolate", ["linear"], ["zoom"],
              // when zoom is 0, set each feature's circle radius to the value of its "rating" property
              0, ["get", "Sum_Action_Passive"],
              // when zoom is 10, set each feature's circle radius to four times the value of its "rating" property
              10, ["*", .8, ["get", "Sum_Action_Passive"]]
          ],
          'circle-opacity': 0.8
        }
    }, labelLayerId);

    map.addLayer({
        "id": "places",
        "type": "circle",
        "source": {
            "type": "geojson",
            'data': './data/BK_google_places.geojson'
        },
        'layout': {
            'visibility': 'none'
        },
        'paint': {
          'circle-color': [
            'match',
            ['get', 'type_cat'],
            'banking_finance','#5c374c',
            'beauty','#7d354d',
            'business','#9e334e',
            'car business','#bc3652',
            'cultural','#d05364',
            'education','#e57076',
            'entertainment','#f29189',
            'food store','#f3b89d',
            'health','#f4dfb1',
            'hospitality','#e6ecb7',
            'nightlife','#c8deaf',
            'other','#abd1a8',
            'public','#98c6a9',
            'religious','#8bbeb0',
            'restaurant and cafe','#7eb5b7',
            'retail','#5c8a95',
            'services','#36576b',
            'transportation','#102542',
            /* other */ '#ccc'
          ],
          'circle-radius': 8,
          'circle-opacity': 0.8
        }
    }, labelLayerId);

    thrScene = new CustomLayer()
    map.addLayer(thrScene);

});

// When a click event occurs on a feature in the places layer, open a popup at the
// location of the feature, with description HTML from its properties.
map.on('click', 'places', function (e) {
  var coordinates = e.features[0].geometry.coordinates.slice();
  var name = e.features[0].properties.name;
  var address = e.features[0].properties.address;
  var type = e.features[0].properties.type_;

  // Ensure that if the map is zoomed out such that multiple
  // copies of the feature are visible, the popup appears
  // over the copy being pointed to.
  while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
    coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
  }

  new mapboxgl.Popup()
  .setLngLat(coordinates)
  .setHTML('<strong>' + name + '</strong></br>' + address + '</br>' + type)
  .addTo(map);
});

// Change the cursor to a pointer when the mouse is over the places layer.
map.on('mouseenter', 'places', function () {
  map.getCanvas().style.cursor = 'pointer';
});

// Change it back to a pointer when it leaves.
map.on('mouseleave', 'places', function () {
  map.getCanvas().style.cursor = '';
});

var storyList = [
  {
    'title':'Urban Comfort Story',
    'text':"Click start to learn about ways that we can consider outdoor urban comfort in Downtown Brooklyn.",
    'mapOptions': {
      'center':[-73.9859,40.6906],
      'zoom':16,
      'pitch':60,
      'bearing':0,
      'speed':0.5
    },
    'mapbox':{
      'visible':[],
      'hidden':['places','survey','comfort','pluto']
    },
    'threejs': {
      'visible':['existing','recent'],
      'hidden':['demo','future']
    }
  },
  {
    'title':'Summer Comfort',
    'text':"This is a comfort map. Green shows areas in comfort for the highest percentage of the time, whereas red shows are in comfort for less of the time.",
    'mapOptions': {
      'center':[-73.98531,40.69202],
      'zoom':15,
      'pitch':0,
      'bearing':0,
      'speed':0.5
    },
    'mapbox':{
      'visible':['comfort'],
      'hidden':['places','survey']
    },
    'threejs': {
      'visible':[],
      'hidden':['existing','recent','demo','future']
    },
    'fillSettings':{
      'layer':'comfort',
      'id':'#irs-comfort',
      'column':'perc_comfort_summer',
      'cmap':'red2green',
      'crange':[50,100],
      'from':0,
      'to':100
    }
  },
  {
    'title':'Summer Comfort',
    'text':"In summer months, the areas that are comfortable the highest percentage of the time are places that are in shade.",
    'mapOptions': {
      'center':[-73.98531,40.69202],
      'zoom':15,
      'pitch':0,
      'bearing':0,
      'speed':0.5
    },
    'mapbox':{
      'visible':['comfort'],
      'hidden':['places','survey']
    },
    'threejs': {
      'visible':[],
      'hidden':['existing','recent','demo','future']
    },
    'fillSettings':{
      'layer':'comfort',
      'id':'#irs-comfort',
      'column':'perc_comfort_summer',
      'cmap':'red2green',
      'crange':[50,100],
      'from':75,
      'to':100
    }
  },
  {
    'title':'Summer Stress',
    'text':"If we look at stress during the summer, we'll see a similar pattern.",
    'mapOptions': {
      'center':[-73.98531,40.69202],
      'zoom':15,
      'pitch':0,
      'bearing':0,
      'speed':0.5
    },
    'mapbox':{
      'visible':['comfort'],
      'hidden':['places','survey']
    },
    'threejs': {
      'visible':[],
      'hidden':['existing','recent','demo','future']
    },
    'fillSettings':{
      'layer':'comfort',
      'id':'#irs-comfort',
      'column':'perc_stress_summer',
      'cmap':'white2red',
      'crange':[0,20],
      'from':0,
      'to':100
    }
  },
  {
    'title':'Summer Stress',
    'text':"The areas that are in extreme heat stress are those open areas that are exposed to the sun.",
    'mapOptions': {
      'center':[-73.98531,40.69202],
      'zoom':15,
      'pitch':0,
      'bearing':0,
      'speed':0.5
    },
    'mapbox':{
      'visible':['comfort'],
      'hidden':['places','survey']
    },
    'threejs': {
      'visible':[],
      'hidden':['existing','recent','demo','future']
    },
    'fillSettings':{
      'layer':'comfort',
      'id':'#irs-comfort',
      'column':'perc_stress_summer',
      'cmap':'white2red',
      'crange':[0,20],
      'from':12,
      'to':100
    }
  },
  {
    'title':'Winter Comfort',
    'text':"In winter months, however, the areas that recieve sun are the most comfortable.",
    'mapOptions': {
      'center':[-73.98531,40.69202],
      'zoom':15,
      'pitch':0,
      'bearing':0,
      'speed':0.5
    },
    'mapbox':{
      'visible':['comfort'],
      'hidden':['places','survey']
    },
    'threejs': {
      'visible':[],
      'hidden':['existing','recent','demo','future']
    },
    'fillSettings':{
      'layer':'comfort',
      'id':'#irs-comfort',
      'column':'perc_comfort_winter',
      'cmap':'red2green',
      'crange':[25,75],
      'from':0,
      'to':100
    }
  },
  {
    'title':'Winter Comfort',
    'text':"In winter months, however, the areas that recieve sun are the most comfortable.",
    'mapOptions': {
      'center':[-73.98531,40.69202],
      'zoom':15,
      'pitch':0,
      'bearing':0,
      'speed':0.5
    },
    'mapbox':{
      'visible':['comfort'],
      'hidden':['places','survey']
    },
    'threejs': {
      'visible':[],
      'hidden':['existing','recent','demo','future']
    },
    'fillSettings':{
      'layer':'comfort',
      'id':'#irs-comfort',
      'column':'perc_comfort_winter',
      'cmap':'red2green',
      'crange':[25,75],
      'from':0,
      'to':40
    }
  },
  {
    'title':'The Plaza at 300 Ashland',
    'text':"Let's take a look at bam plaza. This plaza is also pretty exposed to the solar radiation resulting in poor comfort scores.",
    'mapOptions': {
      'center':[-73.978520,40.686058],
      'zoom':17,
      'pitch':40,
      'bearing':140,
      'speed':0.5
    },
    'mapbox':{
      'visible':['comfort'],
      'hidden':['places','survey']
    },
    'threejs': {
      'visible':['existing','recent'],
      'hidden':['demo','future']
    },
    'fillSettings':{
      'layer':'comfort',
      'id':'#irs-comfort',
      'column':'perc_comfort_summer',
      'cmap':'red2green',
      'crange':[50,100],
      'from':0,
      'to':100
    }
  },
  {
    'title':'Impact of New Development',
    'text':"However, a recently approved building will cast some additional shadow on the plaza bringing more of it into comfort.",
    'mapOptions': {
      'center':[-73.978520,40.686058],
      'zoom':17,
      'pitch':40,
      'bearing':140,
      'speed':0.5
    },
    'mapbox':{
      'visible':['comfort'],
      'hidden':['places','survey']
    },
    'threejs': {
      'visible':['existing','recent','future'],
      'hidden':['demo']
    },
    'fillSettings':{
      'layer':'comfort',
      'id':'#irs-comfort',
      'column':'perc_comfort_future_summer',
      'cmap':'red2green',
      'crange':[50,100],
      'from':0,
      'to':100,
    }
  },
  {
    'title':'Summer Comfort Improved',
    'text':"However, a recently approved building will cast some additional shadow on the plaza bringing more of it into comfort.",
    'mapOptions': {
      'center':[-73.978520,40.686058],
      'zoom':17,
      'pitch':40,
      'bearing':140,
      'speed':0.5
    },
    'mapbox':{
      'visible':['comfort'],
      'hidden':['places','survey']
    },
    'threejs': {
      'visible':['existing','recent','future'],
      'hidden':['demo']
    },
    'fillSettings':{
      'layer':'comfort',
      'id':'#irs-comfort',
      'column':'perc_improve_comfort_summer',
      'cmap':'red2white2green',
      'crange':[-20,20],
      'from':-100,
      'to':100,
    }
  },
  {
    'title':'Winter Comfort Reduced',
    'text':"However, in winter months the comfort is reduced.",
    'mapOptions': {
      'center':[-73.978520,40.686058],
      'zoom':17,
      'pitch':40,
      'bearing':140,
      'speed':0.5
    },
    'mapbox':{
      'visible':['comfort'],
      'hidden':['places','survey']
    },
    'threejs': {
      'visible':['existing','recent','future'],
      'hidden':['demo']
    },
    'fillSettings':{
      'layer':'comfort',
      'id':'#irs-comfort',
      'column':'perc_improve_comfort_winter',
      'cmap':'red2white2green',
      'crange':[-20,20],
      'from':-100,
      'to':100,
    }
  }
]

function storySelect(storyNumber) {

  var mapbox = storyList[storyNumber].mapbox
  var threejs = storyList[storyNumber].threejs
  var fill = storyList[storyNumber].fillSettings

  // fly to here
  map.flyTo(storyList[storyNumber].mapOptions)

  // update text
  $("#story-title").text(storyList[storyNumber].title)
  $("#story-text").text(storyList[storyNumber].text)

  // show mapbox layers
  for (i=0; i < mapbox.visible.length; i++) {
    map.setLayoutProperty(mapbox.visible[i], 'visibility', 'visible');
  }

  // hide mapbox layers
  for (i=0; i < mapbox.hidden.length; i++) {
    map.setLayoutProperty(mapbox.hidden[i], 'visibility', 'none');
  }


  // show threejs layers
  for (i=0; i < threejs.visible.length; i++) {
    showLayer(threejs.visible[i])
  }

  // hide threejs layers
  for (i=0; i < threejs.hidden.length; i++) {
    hideLayer(threejs.hidden[i])
  }

  // udpate comfort title
  $("#" + fill.layer + "-dropdown").text(columnTitles[fill.layer][fill.column]);

  // update comfort map
  updateColorLinear(fill.layer, fill.id, fill.column, fill.cmap, fill.crange)
  map.setFilter(fill.layer, ['all',['<=', fill.column, fill.to],['>=', fill.column, fill.from]])
}

// Start story
$(function(){
  $("#start-button").click(function(e){

    settings.storyItem = settings.storyItem + 1

    // button visibility
    $("#start-button").css({ display: "none" });
    $("#next-button").css({ display: "block" });
    $("#previous-button").css({ display: "block" });
    storySelect(settings.storyItem)
  });
});

// Next story
$(function(){
  $("#next-button").click(function(e){
    settings.storyItem = settings.storyItem + 1
    storySelect(settings.storyItem)
  });
});

// Previous story
$(function(){
  $("#previous-button").click(function(e){
    settings.storyItem = settings.storyItem - 1

    if (settings.storyItem == 0) {
      $("#start-button").css({ display: "block" });
      $("#next-button").css({ display: "none" });
      $("#previous-button").css({ display: "none" });
    }

    storySelect(settings.storyItem)
  });
});

// range slider for comfort
var comfortSlider = $("#irs-comfort")
comfortSlider.ionRangeSlider({
   type: "double",
   grid: true,
   min: 50,
   max: 100,
   from: 50,
   to: 100,
   postfix: "%",
   onFinish: function (data) {
     if (data.to == data.max && data.from == data.min) {
       map.setFilter('comfort', ['all'])
     } else if (data.to == data.max) {
       map.setFilter('comfort', ['all', ['>=', settings.comfort_chosen, data.from]]);
     } else if (data.from == data.min) {
       map.setFilter('comfort', ['all', ['<=', settings.comfort_chosen, data.to]]);
     } else {
       map.setFilter('comfort', ['all',['>=', settings.comfort_chosen, data.from],['<=', settings.pluto_chosen, data.to]]);
     }
   }
});
updateSliderBackground('#comfortSlider','red2green')

// range slider for pluto data
var plutoSlider = $("#irs-pluto")
plutoSlider.ionRangeSlider({
  type: "double",
  grid: true,
  min: 0,
  max: 20000,
  from: 0,
  to: 20000,
  postfix: "sf",
  onFinish: function (data) {
    if (data.to == data.max && data.from == data.min) {
      map.setFilter('pluto', ['all'])
    } else if (data.to == data.max) {
      map.setFilter('pluto', ['all', ['>=', settings.pluto_chosen, data.from]]);
    } else if (data.from == data.min) {
      map.setFilter('pluto', ['all', ['<=', settings.pluto_chosen, data.to]]);
    } else {
      map.setFilter('pluto', ['all',['>=', settings.pluto_chosen, data.from],['<=', settings.pluto_chosen, data.to]]);
    }
  }
});
updateSliderBackground('#plutoSlider','pinks')

// update the gradient background of the slider
function updateSliderBackground (id, colormap) {
 cmap = ''

 for (i=0; i<cmaps[colormap].length; i++) {
   cmap = cmap + ',' + cmaps[colormap][i]
 }

 gradient = 'linear-gradient(to right' + cmap + ')'

 $(id).find('.irs-line').css({background: gradient})
}

// update the radius of circle layers
function updateCircleRadius(layer, column, multiplier) {

  map.setPaintProperty(layer, 'circle-radius', [
      "interpolate", ["linear"], ["zoom"],
      // when zoom is 0, set each feature's circle radius to the value of its "rating" property
      0, ["get", column],
      // when zoom is 10, set each feature's circle radius to ten times the value of its "rating" property
      10, ["*", multiplier, ["get", column]]
  ]);

}

// select attribute to display from comfort mesh
function updateColorLinear(layer, id, column, colormap, colorrange) {

  var linearSteps = []

  map.setFilter(layer);

  settings.comfort_chosen = column

  // update the slider bounds
  $(id).data("ionRangeSlider").update({
    min: colorrange[0],
    max: colorrange[1],
    from: colorrange[0],
    to: colorrange[1]
  });

  updateSliderBackground('#' + $(id).parent().attr("id"), colormap)

  // loop through the crange and cmap arrays to get colors and values
  colorArray = [
        'interpolate',
        ['linear'],
        ['number', ['get', column]]
      ]

  linearSteps = interpolate(colorrange, cmaps[colormap].length)

  for (i=0; i < cmaps[colormap].length; i++) {
    colorArray.push(linearSteps[i])
    colorArray.push(cmaps[colormap][i])
  }

  // update the map
  map.setPaintProperty(layer, 'fill-color', colorArray);
};

// interpolate the values to meet the color steps
function interpolate (range, steps) {
  var difference = (range[1] - range[0]) / (steps - 1)
  var interpolation = []
  for (i=0; i<steps; i++) {
    interpolation.push(range[0] + difference*i)
  }
  return interpolation
}

// toggle mapbox layer
$(function(){
  $("#survey-button").click(function(e){
      var clickedLayer = 'survey';
      e.preventDefault();
      e.stopPropagation();

      var visibility = map.getLayoutProperty(clickedLayer, 'visibility');

      if (visibility === 'visible') {
          map.setLayoutProperty(clickedLayer, 'visibility', 'none');
          $(this).toggleClass('btn-secondary btn-outline-secondary');
          $(this).toggleClass('visible hidden');
          $(this).html('off')
      } else {
          map.setLayoutProperty(clickedLayer, 'visibility', 'visible');
          $(this).toggleClass('btn-outline-secondary btn-secondary');
          $(this).toggleClass('hidden visible');
          $(this).html('on')
      }
  });
});

// toggle mapbox layer
$(function(){
  $("#comfort-button").click(function(e){
      var clickedLayer = 'comfort';
      e.preventDefault();
      e.stopPropagation();

      var visibility = map.getLayoutProperty(clickedLayer, 'visibility');

      if (visibility === 'visible') {
          map.setLayoutProperty(clickedLayer, 'visibility', 'none');
          $(this).toggleClass('btn-secondary btn-outline-secondary');
          $(this).toggleClass('visible hidden');
          $(this).html('off')
      } else {
          map.setLayoutProperty(clickedLayer, 'visibility', 'visible');
          $(this).toggleClass('btn-outline-secondary btn-secondary');
          $(this).toggleClass('hidden visible');
          $(this).html('on')
      }
  });
});

// toggle mapbox layer
$(function(){
  $("#pluto-button").click(function(e){
      var clickedLayer = 'pluto';
      e.preventDefault();
      e.stopPropagation();

      var visibility = map.getLayoutProperty(clickedLayer, 'visibility');

      if (visibility === 'visible') {
          map.setLayoutProperty(clickedLayer, 'visibility', 'none');
          $(this).toggleClass('btn-secondary btn-outline-secondary');
          $(this).toggleClass('visible hidden');
          $(this).html('off')
      } else {
          map.setLayoutProperty(clickedLayer, 'visibility', 'visible');
          $(this).toggleClass('btn-outline-secondary btn-secondary');
          $(this).toggleClass('hidden visible');
          $(this).html('on')
      }
  });
});

// toggle mapbox layer
$(function(){
  $("#places-button").click(function(e){
      var clickedLayer = 'places';
      e.preventDefault();
      e.stopPropagation();

      var visibility = map.getLayoutProperty(clickedLayer, 'visibility');

      if (visibility === 'visible') {
          map.setLayoutProperty(clickedLayer, 'visibility', 'none');
          $(this).toggleClass('btn-secondary btn-outline-secondary');
          $(this).toggleClass('visible hidden');
          $(this).html('off')
      } else {
          map.setLayoutProperty(clickedLayer, 'visibility', 'visible');
          $(this).toggleClass('btn-outline-secondary btn-secondary');
          $(this).toggleClass('hidden visible');
          $(this).html('on')
      }
  });
});

// toggle mapbox layer
$(function(){
  $("#buildings-button").click(function(e){

      if ($(this).hasClass('visible')) {
          $(this).toggleClass('btn-secondary btn-outline-secondary');
          $(this).toggleClass('visible hidden');
          $(this).html('off')
          hideLayer('existing')
          hideLayer('recent')
          hideLayer('future')
          hideLayer('demo')
      } else {
          $(this).toggleClass('btn-outline-secondary btn-secondary');
          $(this).toggleClass('hidden visible');
          $(this).html('on')
          if ($("#existing").hasClass('visible')) {
            showLayer('existing')
          } else {
          }
          if ($("#recent").hasClass('visible')) {
            showLayer('recent')
          } else {
          }
          if ($("#future").hasClass('visible')) {
            showLayer('future')
          } else {
          }
          if ($("#demolished").hasClass('visible')) {
            showLayer('demo')
          } else {
          }
      }
  });
});

// show threejs layers
function hideLayer(name) {
  layer = thrScene.scene.getObjectByName( name )
  layer.traverse ( function (child) {
      if (child instanceof THREE.Mesh) {
          child.visible = false;
      }
  });
}

// hide threejs layers
function showLayer(name) {
  layer = thrScene.scene.getObjectByName( name )
  layer.traverse ( function (child) {
      if (child instanceof THREE.Mesh) {
          child.visible = true;
      }
  });
}

// toggle existing buildings
$(function(){
  $("#existing").click(function(){
    if ($(this).hasClass('visible')) {
      $(this).toggleClass('btn-dark btn-outline-dark');
      $(this).toggleClass('visible hidden');
      hideLayer('existing')
    } else {
      $(this).toggleClass('btn-outline-dark btn-dark');
      $(this).toggleClass('hidden visible');
      showLayer('existing')
    }
  });
});

// toggle demolished buildings
$(function(){
  $("#demolished").click(function(){
    if ($(this).hasClass('visible')) {
      $(this).toggleClass('btn-danger btn-outline-danger');
      $(this).toggleClass('visible hidden');
      hideLayer('demo')
    } else {
      $(this).toggleClass('btn-outline-danger btn-danger');
      $(this).toggleClass('visible hidden');
      showLayer('demo')
    }
  });
});

// toggle recent buildings
$(function(){
  $("#recent").click(function(){
    if ($(this).hasClass('visible')) {
      $(this).toggleClass('btn-info btn-outline-info');
      $(this).toggleClass('visible hidden');
      hideLayer('recent')
    } else {
      $(this).toggleClass('btn-outline-info btn-info');
      $(this).toggleClass('visible hidden');
      showLayer('recent')
    }
  });
});

// toggle future buildings
$(function(){
  $("#future").click(function(){
    if ($(this).hasClass('visible')) {
      $(this).toggleClass('btn-warning btn-outline-warning');
      $(this).toggleClass('visible hidden');
      hideLayer('future')
    } else {
      $(this).toggleClass('btn-outline-warning btn-warning');
      $(this).toggleClass('visible hidden');
      showLayer('future')
    }
  });
});

//update the menu title to display selected category
$(function(){
  $("#survey-dropdown-item button").click(function(){
    $("#survey-dropdown").text($(this).text());
  });
});

//update the menu title to display selected category
$(function(){
  $("#comfort-dropdown-item button").click(function(){
    $("#comfort-dropdown").text($(this).text());
  });
});

//update the menu title to display selected category
$(function(){
  $("#pluto-dropdown-item button").click(function(){
    $("#pluto-dropdown").text($(this).text());
  });
});
