//FIRE SCRIPT
   var websql;
     $(document).ready(function() {
      console.log("Begin SQLite Process");
	websql = window.openDatabase("localize2", "1.0", "Location Logging App", 1024);

	//CREATE DATA TABLE & CHANGE LOG TABLE 
        websql.transaction(function(tx) {
        tx.executeSql("CREATE TABLE IF NOT EXISTS positions (id INTEGER PRIMARY KEY AUTOINCREMENT, address TEXT, feature TEXT, value1 TEXT, lat DOUBLE, lng DOUBLE, updated DATE)");
        tx.executeSql("CREATE TABLE IF NOT EXISTS log (text TEXT, timestamp DATE)");
        },dbError,function(tx) { 
        getPosition();
       });

        //ERROR IF
	function dbError(e) {
	 console.log("SQL ERROR");
	 console.dir(e);
        }

	//QUERY DATA FOR LOAD - PREVIOUS DATA ALREADY IN DB - INCLUDES WILDCARD SEARCH (DISABLED)
	function getPosition(search) {
	websql.readTransaction(function(tx) {
	 if(!search) {
	  tx.executeSql("SELECT id, address, feature, value1, lat, lng, updated FROM positions ORDER BY updated DESC", [], displayPositions);
	  } else {
	 var wild = "%" + search + "%";
	tx.executeSql("SELECT id, address, feature, value1, lat, lng, updated FROM positions WHERE lat LIKE ? or LNG LIKE ? ORDER BY updated DESC", [wild,wild], displayPositions);
       }
      }, dbError);
     }

	//LAYOUT OF BOOTSTRAP TABLE
	function displayPositions(tx,results) {
	 var data = convertResults(results);
	 if(data.length === 0) {
	  $("#Table").hide();
	  $("#status").html("<p>No Data Has Been Logged Yet</p>");
	 } else {
	  $("#status").html("");
	  $("#Table").show();
	 var s = "";
	  for(var i=0;i<data.length;i++) {
	 var d = new Date();
	 d.setTime(data[i].updated);
	s+= "<tr data-id='"+data[i].id+"'><td><a class='PositionRecord'>"+(data[i].lat?data[i].lat:"N/A")+" "+(data[i].lng?data[i].lng:"N/A")
	+"</a></td><td>"+(data[i].address?data[i].address:"N/A")
	+"<td>"
	+(data[i].feature?data[i].feature:"N/A")
	+"</a></td><td>"
	+(data[i].value1?data[i].value1:"N/A")
	+"</a></td><td>"+d.toDateString()
	+ " "+d.toTimeString()
	+"</td>";
	 s+= "<td><img class='PositionEdit' src='img/page_edit.png' lat='Edit'> <img class='PositionDelete' src='img/page_delete.png' lat='Delete'></td>";
	 s+= "</tr>";
	}
	 $("#Table tbody").html(s);
	}
       }

        //RECORD DELETE SEQUENCE
	function deletePosition(id,cb) {
	 websql.transaction(function(tx) {
	 tx.executeSql("DELETE FROM positions WHERE id = ?", [id], function(tx) {
	cb();
	});
       });

         //MAKE A RECORD OF THE TRANSACTION
	 websql.transaction(function(tx) {
	  tx.executeSql("INSERT INTO log(text, timestamp) VALUES (?,?)", ["Deleted "+id, new Date().getTime()], function() {});
	});
       }
   
        //QUERY & READ DATA UP TO THIS POINT
	function grabPosition(id,cb) {
	 websql.readTransaction(function(tx) {
	 tx.executeSql("SELECT address, feature, value1, lat, lng, updated FROM positions WHERE id = ?", [id], function(tx,results) {
	 var result = convertResults(results)[0];
	 cb(result);
	 });
        },dbError);
       }
        
        //ON BUTTON PRESS ADD RECORD FROM GEOLOCATION FORMS
        $("#doOpenForm").on("click", function() {
	 $("#displayDiv").hide();
	 $("#editDiv").show();
	});
 
        //UPDATE DATA ALREADY IN DATABASE BUTTON SUBMIT PRE
	$("#doLogPositions").on("click", function(e) {
	 e.preventDefault();
	 var address = $("#address").val();
	 var feature = $("#feature").val();
	 var value1 = $("#value1").val();
	 var lat = $("#lat").val();
	 var lng = $("#lng").val();

        //UPDATE ROUTINE FOR DATA TABLE
	websql.transaction(function(tx) {
	 var existingId = $("#editDiv").data("xy");  //XY AS TABLE DATA
	 if(existingId) {
	tx.executeSql("UPDATE positions SET address=?, feature=?, value1=?, lat=?, lng=?, updated=? WHERE id=?", [address, feature, value1, lat, lng, new Date().getTime(), existingId]);
	 } else {
	tx.executeSql("INSERT INTO positions (address, feature, value1, lat, lng, updated) VALUES (?,?,?,?,?,?)", [address, feature, value1, lat, lng, new Date().getTime()]);
	 }
	  $("#address").val("");
	  $("#feature").val("");
	  $("#value1").val("");
  	  $("#lat").val("");
	  $("#lng").val("");
	  $("#editDiv").removeData("xy").hide();
	  $("#editDiv").hide();

        //UPDATE LOG FILE
	websql.transaction(function(tx) {
	tx.executeSql("INSERT INTO log (text, timestamp) VALUES (?,?)", ["Added or edited "+lat+lng, new Date().getTime()], function() {});
	});
	 }, dbError, getPosition);
        });
	$(document).on("click", ".PositionRecord", function(e) {
	e.preventDefault();
	$("#editDiv").hide();
	var record = $(this).parent().parent().data("id");
	grabPosition(record, function(object) {
        $("#displayDiv h2").text(object.address);
	$("#displayDiv h2").text(object.feature);
	$("#displayDiv h2").text(object.value1);
        $("#displayDiv h2").text(object.lat?object.lat:"No Coordinates");
	$("#displayDiv h2").text(object.lng);
	$("#displayDiv").show();
	});
       });
        
        //DELETE ONE RECORD AT A TIME
	$(document).on("click", ".PositionDelete", function(e) {
	e.preventDefault();
	var record = $(this).parent().parent().data("id");
	deletePosition(record, getPosition);
	});
        
        //EDIT RECORD
	$(document).on("click", ".PositionEdit", function(e) {
	e.preventDefault();
	 var record = $(this).parent().parent().data("id");
	grabPosition(record, function(object) {
	 $("#address").val(object.address);
	 $("#feature").val(object.feature);
	 $("#value1").val(object.value1);
         $("#lat").val(object.lat);
	 $("#lng").val(object.lng);
	 $("#displayDiv").hide();
	 $("#editDiv").data("xy",record).show();
	});
       });
       
        //IF SEARCH IS USED - APPLY FILTER
	 $("#searchField").on("input", function(e) {
	  var value = $.trim($(this).val());
	 $("#editDiv").hide();
	 $("#displayDiv").hide();
	getPosition(value);
       });

        //JSON PARSE ROUTINE 
	function jsonparse(table) {
	 var def = new $.Deferred();
	websql.readTransaction(function(tx) {
	tx.executeSql("SELECT * FROM "+table, [], function(tx,results) { //SELECT ALL (QUERY CAPABILITY POSSIBLE)
	 var data = convertResults(results); {
	 console.dir(data);
	 def.resolve(data);
         }
	  });
	 }, dbError);
	  return def;
         }

	//BUTTON CLICK TO CONSOLE.LOG - JSON
	$(document).on("click", "#doJSONSubmit", function(e) {
	e.preventDefault();
	console.log("Create JSON Process");
	$.when(
	jsonparse("positions")).then(function(positions) {
	console.log("String Generated");

	//STRINGIFY JSON AND SERIALIZE DATA
	 var data = {positions:positions};
	 var serializedData = ('Formatted', JSON.stringify(data, null, 4)); //FORMAT CASCADED
	alert(serializedData);
	});
       });

        //GEOJSON PARSE ROUTINE - BUSTED
	function geojson(table) {
	 var def = new $.Deferred();
	websql.readTransaction(function(tx) {
	tx.executeSql("SELECT * FROM "+table, [], function(tx,results) {
	var data = {
       type: 'Feature',
      geometry: {
       type: 'Point', 
    	coordinates: [def.lng, def.lat]
       },
  	 properties: {
    	  id: def.id,
    	   updated: def.updated
  	},
       };
         console.dir(data);
	  def.resolve(data);
	});
       }, dbError);
	 return def;
       }
 
        //BUTTON CLICK TO CONSOLE.LOG - GEOJSON
	$(document).on("click", "#doGeoJSONSubmit", function(e) {
	e.preventDefault();
	console.log("Create GeoJSON");
	$.when(
	geojson("positions")).then(function(positions) {
	console.log("String Generated");

	//PARSE ATTEMPT
	 var data = {positions:positions};
	 var geojson = ('Formatted', JSON.stringify(data, null, 4)); 
	alert(geojson);
	});
       });
      });
   

	//GENERAL UTILITY - CONVERSION
	function convertResults(resultset) {
	 var results = [];
	  for(var i=0,len=resultset.rows.length;i<len;i++) {
	 var row = resultset.rows.item(i);
	 var result = {};
	for(var key in row) {
	result[key] = row[key];
	}
	results.push(result);
	}
	 return results;
       }
     
      //EOF
