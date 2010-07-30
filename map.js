/*
	This file is part of cdauth’s map.

	OSM Route Manager is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	cdauth’s map is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with cdauth’s map.  If not, see <http://www.gnu.org/licenses/>.

	Obtain the source code from http://gitorious.org/cdauths-map
	or git://gitorious.org/cdauths-map/map.git.
*/

var mapObject;
var layerResults;
var layerRouting;
var nameFinder;
var searchResults;
var searchTargetResults;
var isRoutingSearch = false;

var searchFavourites = { };

function initMap()
{
	if(location.search.length > 1)
	{ // Move query string to location hash part
		var search_obj = decodeQueryString(location.search.substr(1));
		var hash_obj = decodeQueryString(OpenLayers.URLHashHandler.prototype.getLocationHash());
		for(var i in search_obj)
			hash_obj[i] = search_obj[i];
		location.replace(location.pathname+"#"+encodeQueryString(hash_obj));
		return;
	}

	var form_el = document.createElement("form");
	form_el.method = "get";
	form_el.action = "";
	form_el.id = "search";
	form_el.onsubmit = function(){ geoSearch(); return false; };
	var el1,el2,el3,el4;
	el1 = document.createElement("dl");
	el2 = document.createElement("dt");
	el3 = document.createElement("label");
	el3.htmlFor = "search-input";
	el3.appendChild(document.createTextNode(OpenLayers.i18n("Search")));
	el2.appendChild(el3);
	el1.appendChild(el2);
	el2 = document.createElement("dd");
	el3 = document.createElement("input");
	el3.type = "text";
	el3.id = "search-input";
	el3.name = "search";
	el3.title = OpenLayers.i18n("Enter a search string, a URL of a GPX, KML, OSM or GML file or an OSM object like “node 123” or “trace 123”.");
	el2.appendChild(el3);
	el1.appendChild(el2);

	el2 = document.createElement("dt");
	el3 = document.createElement("label");
	el3.htmlFor = "search-target-input";
	el3.appendChild(document.createTextNode(OpenLayers.i18n("Destination")));
	el2.appendChild(el3);
	el1.appendChild(el2);
	el2 = document.createElement("dd");
	el3 = document.createElement("input");
	el3.type = "text";
	el3.id = "search-target-input";
	el3.name = "target";
	el2.appendChild(el3);
	el1.appendChild(el2);

	form_el.appendChild(el1);

	el1 = document.createElement("ul");
	el2 = document.createElement("li");
	el3 = document.createElement("input");
	el3.type = "submit";
	el3.id = "search-button";
	el3.value = OpenLayers.i18n("Search");
	el2.appendChild(el3);
	el1.appendChild(el2);
	el2 = document.createElement("li");
	el3 = document.createElement("input");
	el3.type = "button";
	el3.id = "search-button-reset";
	el3.onclick = function(){ document.getElementById("search-input").value = document.getElementById("search-target-input").value = ""; this.form.onsubmit(); return false; };
	el3.value = OpenLayers.i18n("Clear");
	el2.appendChild(el3);
	el1.appendChild(el2);

	el2 = document.createElement("li");
	el3 = document.createElement("select");
	el3.id = "search-route-type";
	el3.onchange = el3.onkeyup = el3.onclick = function() { if(layerRouting != null && layerRouting.routingType != this.value) layerRouting.setType(this.value); };
	el4 = document.createElement("option");
	el4.value = OpenLayers.cdauth.Routing.Type.FASTEST;
	el4.appendChild(document.createTextNode(OpenLayers.i18n("Fastest")));
	el3.appendChild(el4);
	el4 = document.createElement("option");
	el4.value = OpenLayers.cdauth.Routing.Type.SHORTEST;
	el4.appendChild(document.createTextNode(OpenLayers.i18n("Shortest")));
	el3.appendChild(el4);
	el2.appendChild(el3);
	el1.appendChild(el2);

	el2 = document.createElement("li");
	el3 = document.createElement("select");
	el3.id = "search-route-medium";
	el3.onchange = el3.onkeyup = el3.onclick = function() { if(layerRouting != null && layerRouting.medium != this.value) layerRouting.setMedium(this.value); };
	el4 = document.createElement("option");
	el4.value = OpenLayers.cdauth.Routing.Medium.CAR;
	el4.appendChild(document.createTextNode(OpenLayers.i18n("Car")));
	el3.appendChild(el4);
	el4 = document.createElement("option");
	el4.value = OpenLayers.cdauth.Routing.Medium.BICYCLE;
	el4.appendChild(document.createTextNode(OpenLayers.i18n("Bicycle")));
	el3.appendChild(el4);
	el4 = document.createElement("option");
	el4.value = OpenLayers.cdauth.Routing.Medium.FOOT;
	el4.appendChild(document.createTextNode(OpenLayers.i18n("Foot")));
	el3.appendChild(el4);
	el2.appendChild(el3);
	el1.appendChild(el2);

	form_el.appendChild(el1);

	el1 = document.createElement("div");
	el1.id = "search-toggle-routing";
	el2 = document.createElement("a");
	el2.href = "javascript:undefined";
	el2.appendChild(document.createTextNode("")); // Is added in hideRoutingForm()
	el1.appendChild(el2);
	form_el.appendChild(el1);

	el1 = document.createElement("p");
	el1.id = "search-osm-cc";
	el1.innerHTML = OpenLayers.i18n("Search results from <a href=\"http://www.openstreetmap.org/\">OpenStreetMap</a>, <a href=\"http://creativecommons.org/licenses/by-sa/2.0/\">cc-by-sa-2.0</a>");
	form_el.appendChild(el1);

	el1 = document.createElement("ul");
	el1.id = "search-route-info";
	el1.style.display = "none";
	form_el.appendChild(el1);

	el1 = document.createElement("div");
	el1.id = "search-results";
	el1.style.display = "none";

	el2 = document.createElement("div");
	el2.id = "search-results-toggle";
	el3 = document.createElement("a");
	el3.href = "javascript:undefined";
	el3.onclick = function() {
		if(searchResults.style.display == "none")
		{
			this.firstChild.data = OpenLayers.i18n("Show results");
			searchResults.style.display = "block";
			if(document.getElementById("search-target-input").style.display != "none")
				searchTargetResults.parentNode.style.display = "block";
		}
		else
		{
			this.firstChild.data = OpenLayers.i18n("Hide results");
			searchResults.style.display = "none";
			searchTargetResults.parentNode.style.display = "none";
		}
	};
	el3.appendChild(document.createTextNode(OpenLayers.i18n("Hide results")));
	el2.appendChild(el3);
	el1.appendChild(el2);

	searchResults = document.createElement("ol");
	el1.appendChild(searchResults);

	form_el.appendChild(el1);

	el1 = document.createElement("div");
	el1.id = "search-target-results";
	el1.style.display = "none";

	el2 = document.createElement("div");
	searchTargetResults = document.createElement("ol");
	el1.appendChild(searchTargetResults);

	form_el.appendChild(el1);

	domInsertAfter(form_el, document.getElementById("map"));

	hideRoutingForm();

	OpenLayers.Popup.OPACITY = 0.7;

	mapObject = new OpenLayers.Map.cdauth("map", { cdauthTheme : null });

	var addingLayers = true;
	mapObject.setBaseLayer = function(layer) {
		if(addingLayers)
		{ // Prevent loading the default base layer if another layer will be set initially by the Permalink
			layer.setVisibility(false);
			return;
		}
		OpenLayers.Map.cdauth.prototype.setBaseLayer.apply(this, arguments);
	};

	mapObject.addAllAvailableLayers();
	mapObject.addLayer(new OpenLayers.Layer.cdauth.CoordinateGrid(null, { visibility: false, shortName: "grid" }));

	var activeTool = null;
	var cookies = document.cookie.split(/;\s*/);
	for(var i=0; i<cookies.length; i++)
	{
		var cookie = cookies[i].split("=");
		if(cookie[0] == "cdauthTool")
		{
			activeTool = decodeURIComponent(cookie[1]);
			break;
		}
	}

	var toolbar = new OpenLayers.Control.Panel();
	var moveControl = new OpenLayers.Control({ title : OpenLayers.i18n("Move map") });
	mapObject.addControl(moveControl);
	toolbar.addControls(moveControl);
	toolbar.defaultControl = moveControl;

	var osb = new OpenLayers.Layer.OpenStreetBugs(OpenLayers.i18n("OpenStreetBugs"), { visibility: false, theme: null, shortName: "OSBu" });
	mapObject.addLayer(osb);

	var osbControl = new OpenLayers.Control.OpenStreetBugs(osb);
	mapObject.addControl(osbControl);
	toolbar.addControls(osbControl);

	var layerMarkers = new OpenLayers.Layer.cdauth.Markers.LonLat(OpenLayers.i18n("Markers"), { shortName : "m", saveInPermalink : true });
	mapObject.addLayer(layerMarkers);
	var markerControl = new OpenLayers.Control.cdauth.CreateMarker(layerMarkers);
	mapObject.addControl(markerControl);
	toolbar.addControls(markerControl);

	mapObject.addControl(toolbar);
	if(activeTool)
	{
		for(var i=0; i<toolbar.controls.length; i++)
		{
			if(toolbar.controls[i].title == activeTool)
			{
				toolbar.activateControl(toolbar.controls[i]);
				break;
			}
		}
	}

	toolbar.activateControl = function(control) {
		var ret = OpenLayers.Control.Panel.prototype.activateControl.apply(this, arguments);

		document.cookie = "cdauthTool="+encodeURIComponent(control.title)+";expires="+(new Date((new Date()).getTime() + 86400000000)).toGMTString();
		return ret;
	};

	nameFinder = new OpenLayers.cdauth.NameFinder.Nominatim();
	layerResults = new OpenLayers.Layer.cdauth.Markers.GeoSearch(OpenLayers.i18n("Search results"), nameFinder, { shortName : "s", saveInPermalink : true });
	mapObject.addLayer(layerResults);

	addingLayers = false;
	var hashHandler = new OpenLayers.Control.cdauth.URLHashHandler({
		updateMapView : function() {
			var query_object = decodeQueryString(this.hashHandler.getLocationHash());
			if(typeof query_object.search != "undefined" && query_object.search != "%s")
			{
				if(query_object.target != undefined && query_object.target != "%s")
				{
					showRoutingForm();
					document.getElementById("search-target-input").value = query_object.target;
					if(query_object.l != undefined && query_object.l.r != undefined)
						delete query_object.l.r;
				}
				document.getElementById("search-input").value = query_object.search;
				if(query_object.l != undefined && query_object.l.s != undefined)
					delete query_object.l.s;
				geoSearch();
			}

			if(query_object.l != undefined && query_object.l.s != undefined)
				document.getElementById("search-input").value = query_object.l.s.search;

			if(query_object.l != undefined && query_object.l.r != undefined)
			{
				showRoutingForm();
				createRoutingLayer();

				if(query_object.l.r.type != undefined)
					document.getElementById("search-route-type").value = query_object.l.r.type;
				if(query_object.l.r.medium != undefined)
					document.getElementById("search-route-medium").value = query_object.l.r.medium;
				if(query_object.l.r.from != undefined && query_object.l.r.from.lon != undefined && query_object.l.r.from.lat != undefined)
					document.getElementById("search-input").value = query_object.l.r.from.lat+","+query_object.l.r.from.lon;
				if(query_object.l.r.to != undefined && query_object.l.r.to.lon != undefined && query_object.l.r.to.lat != undefined)
					document.getElementById("search-target-input").value = query_object.l.r.to.lat+","+query_object.l.r.to.lon;
			}
			else
			{
				removeRoutingLayer();
				hideRoutingForm();
			}

			this.map.zoomToQuery(query_object);
			this.updateLocationHash();
		}
	});
	mapObject.addControl(hashHandler);
	if(location.hash == "" || location.hash == "#")
		location.hash = "#lat=0;lon=0;zoom=2";
	hashHandler.activate();

	mapObject.addControl(new OpenLayers.Control.cdauth.GeoLocation());
}

function onSearchStart()
{
	document.getElementById("search-input").disabled =
	document.getElementById("search-target-input").disabled =
	document.getElementById("search-route-type").disabled =
	document.getElementById("search-route-medium").disabled =
	document.getElementById("search-button").disabled =
	document.getElementById("search-button-reset").disabled = true;
}

function onSearchEnd()
{
	document.getElementById("search-input").disabled =
	document.getElementById("search-target-input").disabled =
	document.getElementById("search-route-type").disabled =
	document.getElementById("search-route-medium").disabled =
	document.getElementById("search-button").disabled =
	document.getElementById("search-button-reset").disabled = false;
}

function createRoutingLayer()
{
	if(layerRouting == null)
	{
		layerRouting = new OpenLayers.Layer.cdauth.XML.Routing(OpenLayers.i18n("Directions"), { shortName : "r", saveInPermalink : true });
		mapObject.addLayer(layerRouting);

		layerRouting.setType(document.getElementById("search-route-type").value);
		layerRouting.setMedium(document.getElementById("search-route-medium").value);

		layerRouting.events.register("loadstart", layerRouting, function() {
			onSearchStart();
			document.getElementById("search-route-info").style.display = "none";
		});
		layerRouting.events.register("allloadend", layerRouting, function() {
			onSearchEnd();

			var info = document.getElementById("search-route-info");
			while(info.firstChild)
				info.removeChild(info.firstChild);
			info.style.display = "block";

			var distance = this.getDistance();
			var duration = this.getDuration();
			var detailedLink = this.getDetailedLink();
			var el1,el2;

			if(distance != null)
			{
				el1 = document.createElement("li");
				el1.appendChild(document.createTextNode(OpenLayers.i18n("Distance")+": "+(Math.round(distance*10)/10)+"\u2009"));
				el2 = document.createElement("abbr");
				el2.title = OpenLayers.i18n("kilometers");
				el2.appendChild(document.createTextNode("km"));
				el1.appendChild(el2);
				info.appendChild(el1);
			}

			if(duration != null)
			{
				el1 = document.createElement("li");
				var minutes = Math.round(duration*60)%60;
				if(minutes < 10)
					minutes = "0"+minutes;
				el1.appendChild(document.createTextNode(OpenLayers.i18n("Duration")+": "+Math.floor(duration)+":"+minutes+"\u2009"));
				el2 = document.createElement("abbr");
				el2.title = OpenLayers.i18n("hours");
				el2.appendChild(document.createTextNode("h"));
				el1.appendChild(el2);
				info.appendChild(el1);
			}

			if(detailedLink != null)
			{
				el1 = document.createElement("li");
				el2 = document.createElement("a");
				el2.href = detailedLink;
				el2.appendChild(document.createTextNode(OpenLayers.i18n("Detailed driving instructions")));
				el1.appendChild(el2);
				info.appendChild(el1);
			}
		});
		layerRouting.events.register("draggedRoute", layerRouting, function() {
			document.getElementById("search-input").value = this.from.lat+","+this.from.lon;
			document.getElementById("search-target-input").value = this.to.lat+","+this.to.lon;
		});
	}
}

function removeRoutingLayer()
{
	if(layerRouting != null)
	{
		mapObject.removeLayer(layerRouting);
		layerRouting.destroyFeatures();
		// layerRouting.destroy() is not possible as layerRouting is somehow still used
		layerRouting = null;
	}
}

function showRoutingForm()
{
	document.getElementById("search-route-type").parentNode.style.display =
	document.getElementById("search-route-medium").parentNode.style.display = "inline";
	document.getElementById("search-target-input").style.display = "block";
	searchTargetResults.parentNode.style.display = searchResults.parentNode.style.display;
	document.getElementById("search-button").value = OpenLayers.i18n("Get directions");
	document.getElementById("search-toggle-routing").firstChild.firstChild.data = OpenLayers.i18n("Hide directions");
	document.getElementById("search-toggle-routing").firstChild.onclick = function() { hideRoutingForm(); };
}

function hideRoutingForm()
{
	document.getElementById("search-route-type").parentNode.style.display =
	document.getElementById("search-route-medium").parentNode.style.display =
	document.getElementById("search-target-input").style.display =
	searchTargetResults.parentNode.style.display = "none";
	document.getElementById("search-button").value = OpenLayers.i18n("Search");
	document.getElementById("search-toggle-routing").firstChild.firstChild.data = OpenLayers.i18n("Get directions");
	document.getElementById("search-toggle-routing").firstChild.onclick = function() { showRoutingForm(); };

	if(layerRouting)
	{
		removeRoutingLayer();
		var search = document.getElementById("search-input").value;
		document.getElementById("search-input").value = "";
		geoSearch();
		document.getElementById("search-input").value = search;
	}
}

function geoSearch()
{
	var search = document.getElementById("search-input").value.replace(/^\s+/, "").replace(/\s+$/, "");
	var searchTarget = document.getElementById("search-target-input").value.replace(/^\s+/, "").replace(/\s+$/, "");
	layerResults.showResults([ ]);
	while(searchResults.firstChild)
		searchResults.removeChild(searchResults.firstChild);
	while(searchTargetResults.firstChild)
		searchTargetResults.removeChild(searchTargetResults.firstChild);
	searchResults.parentNode.style.display = "none";
	searchTargetResults.parentNode.style.display = "none";
	document.getElementById("search-route-info").style.display = "none";

	isRoutingSearch = false;
	removeRoutingLayer();

	if(search == "")
		return;

	onSearchStart();

	var gpx = false;
	if(search.match(/^http:\/\//) && !search.match(/^http:\/\/(www\.)?osm\.org\/go\//))
	{
		var m;
		if(m = search.match(/[#?](.*)$/))
		{
			var query_string = decodeQueryString(m[1]);
			if(typeof query_string.lon == "undefined" || typeof query_string.lat == "undefined")
				gpx = true;
		}
		else
			gpx = true;
	}
	else
	{
		var m = search.match(/^(node|way|relation|trace)\s*#?\s*(\d+)$/i);
		if(m)
		{
			gpx = true;
			switch(m[1].toLowerCase())
			{
				case "node": search = "http://www.openstreetmap.org/api/0.6/node/"+m[2]; break;
				case "way": search = "http://www.openstreetmap.org/api/0.6/way/"+m[2]+"/full"; break;
				case "relation": search = "http://www.openstreetmap.org/api/0.6/relation/"+m[2]+"/full"; break;
				case "trace": search = "http://www.openstreetmap.org/trace/"+m[2]+"/data"; break;
			}
		}
	}

	if(gpx)
	{
		var layer = new OpenLayers.Layer.cdauth.XML(null, search, { removableInLayerSwitcher: true, saveInPermalink : true });
		mapObject.addLayer(layer);
		layer.events.register("loadend", layer, function() {
			var extent = this.getDataExtent();
			if(extent)
				mapObject.zoomToExtent(extent);
			onSearchEnd();
		});
	}
	else
	{
		if(searchTarget != "" && document.getElementById("search-target-input").style.display != "none")
		{
			isRoutingSearch = true;
			createRoutingLayer();
		}

		nameFinder.find(search, function(results){
			if(!isRoutingSearch)
				layerResults.showResults(results, search, true);

			if(results == undefined || results.length == 0)
				alert(OpenLayers.i18n("No results."));
			else
			{
				for(var i=0; i<results.length; i++)
				{
					results[i].showOnMap = function() {
						searchFavourites[search] = this.lonlat;
						for(var j=0; j<layerResults.markers.length; j++)
							layerResults.markers[j].cdauthFeature.popup.hide();
						if(isRoutingSearch)
							layerRouting.setFrom(this.lonlat, true);
						else
						{
							this.marker.cdauthFeature.popup.show();
							mapObject.setCenter(this.lonlat.clone().transform(new OpenLayers.Projection("EPSG:4326"), mapObject.getProjectionObject()), this.getZoom(mapObject));
						}
					};

					var li = document.createElement("li");
					var a = document.createElement("a");
					a.href = "javascript:undefined";
					(function(result) {
						a.onclick = function() { result.showOnMap() };
					})(results[i]);
					a.appendChild(document.createTextNode(results[i].name));
					li.appendChild(a);
					li.appendChild(document.createTextNode(" "));
					var span = document.createElement("span");
					span.className = "search-result-info";
					span.appendChild(document.createTextNode("("+results[i].info+")"));
					li.appendChild(span);
					searchResults.appendChild(li);
				}

				var show = 0;
				if(searchFavourites[search] != undefined)
				{
					for(var i=0; i<results.length; i++)
					{
						if(searchFavourites[search].lon == results[i].lonlat.lon && searchFavourites[search].lat == results[i].lonlat.lat)
						{
							show = i;
							break;
						}
					}
				}
				results[show].showOnMap();
			}

			searchResults.parentNode.style.display = "block";
			if(document.getElementById("search-target-input").style.display != "none")
				searchTargetResults.parentNode.style.display = "block";

			if(results == undefined || results.length == 0 || !isRoutingSearch)
				onSearchEnd();
		});

		if(isRoutingSearch)
		{
			nameFinder.find(searchTarget, function(results){
				if(results == undefined || results.length == 0)
				{
					alert(OpenLayers.i18n("No results."));
					onSearchEnd();
				}
				else
				{
					for(var i=0; i<results.length; i++)
					{
						results[i].showOnMap = function() {
							searchFavourites[searchTarget] = this.lonlat;
							layerRouting.setTo(this.lonlat, true);
						};

						var li = document.createElement("li");
						var a = document.createElement("a");
						a.href = "javascript:undefined";
						(function(result) {
							a.onclick = function() { result.showOnMap() };
						})(results[i]);
						a.appendChild(document.createTextNode(results[i].name));
						li.appendChild(a);
						li.appendChild(document.createTextNode(" "));
						var span = document.createElement("span");
						span.className = "search-result-info";
						span.appendChild(document.createTextNode("("+results[i].info+")"));
						li.appendChild(span);
						searchTargetResults.appendChild(li);
					}

					var show = 0;
					if(searchFavourites[searchTarget] != undefined)
					{
						for(var i=0; i<results.length; i++)
						{
							if(searchFavourites[searchTarget].lon == results[i].lonlat.lon && searchFavourites[searchTarget].lat == results[i].lonlat.lat)
							{
								show = i;
								break;
							}
						}
					}
					results[show].showOnMap();
				}
				searchResults.parentNode.style.display = "block";
				searchTargetResults.parentNode.style.display = "block";
			});
		}
	}
}

OpenLayers.Lang.en = OpenLayers.Util.extend(OpenLayers.Lang.en, {
	"Move map" : "Move map",
	"Search" : "Search",
	"Enter a search string, a URL of a GPX, KML, OSM or GML file or an OSM object like “node 123” or “trace 123”." : "Enter a search string, a URL of a GPX, KML, OSM or GML file or an OSM object like “node 123” or “trace 123”.",
	"Clear" : "Clear",
	"Search results from <a href=\"http://www.openstreetmap.org/\">OpenStreetMap</a>, <a href=\"http://creativecommons.org/licenses/by-sa/2.0/\">cc-by-sa-2.0</a>" : "Search results from <a href=\"http://www.openstreetmap.org/\">OpenStreetMap</a>, <a href=\"http://creativecommons.org/licenses/by-sa/2.0/\">cc-by-sa-2.0</a>",
	"OpenStreetBugs" : "OpenStreetBugs",
	"Markers" : "Markers",
	"Search results" : "Search results",
	"No results." : "No results.",
	"Shortest" : "Shortest",
	"Fastest" : "Fastest",
	"Car" : "Car",
	"Bicycle" : "Bicycle",
	"Foot" : "Foot",
	"Get directions" : "Get directions",
	"Hide directions" : "Hide directions",
	"Hide results" : "Hide results",
	"Show results" : "Show results",
	"Directions" : "Directions",
	"Destination" : "Destination",
	"Distance" : "Distance",
	"Duration" : "Duration",
	"kilometers" : "kilometers",
	"hours" : "hours"
});

OpenLayers.Lang.de = OpenLayers.Util.extend(OpenLayers.Lang.de, {
	"Move map" : "Karte verschieben",
	"Search" : "Suchen",
	"Enter a search string, a URL of a GPX, KML, OSM or GML file or an OSM object like “node 123” or “trace 123”." : "Ein Suchbegriff, eine URL einer GPX-, KML- OSM- oder GML-Datei oder ein OSM-Objekt wie „node 123“, „way 123“, „relation 123“ oder „trace 123“",
	"Clear" : "Löschen",
	"Search results from <a href=\"http://www.openstreetmap.org/\">OpenStreetMap</a>, <a href=\"http://creativecommons.org/licenses/by-sa/2.0/\">cc-by-sa-2.0</a>" : "Suchergebnisse aus <a href=\"http://www.openstreetmap.org/\">OpenStreetMap</a>, <a href=\"http://creativecommons.org/licenses/by-sa/2.0/\">cc-by-sa-2.0</a>",
	"OpenStreetBugs" : "OpenStreetBugs",
	"Markers" : "Marker",
	"Search results" : "Suchergebnisse",
	"No results." : "Kein Ergebnis.",
	"Shortest" : "Kürzeste",
	"Fastest" : "Schnellste",
	"Car" : "Auto",
	"Bicycle" : "Fahrrad",
	"Foot" : "Zu Fuß",
	"Get directions" : "Route berechnen",
	"Hide directions" : "Route ausblenden",
	"Hide results" : "Einklappen",
	"Show results" : "Ausklappen",
	"Directions" : "Route",
	"Destination" : "Ziel",
	"Distance" : "Entfernung",
	"Duration" : "Dauer",
	"kilometers" : "Kilometer",
	"hours" : "Stunden"
});