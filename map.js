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

	Obtain the source code from http://svn.cdauth.de/viewvc.cgi/Tools/osm/map/
	or svn://svn.cdauth.de/tools/osm/map/.
*/

var mapObject;
var layerResults;

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
	var el1,el2,el3;
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
	el3.onclick = function(){ document.getElementById("search-input").value = ""; this.form.onsubmit(); return false; };
	el3.value = OpenLayers.i18n("Clear");
	el2.appendChild(el3);
	el1.appendChild(el2);
	form_el.appendChild(el1);

	el1 = document.createElement("p");
	el1.id = "search-osm-cc";
	el1.innerHTML = OpenLayers.i18n("Search results from <a href=\"http://www.openstreetmap.org/\">OpenStreetMap</a>, <a href=\"http://creativecommons.org/licenses/by-sa/2.0/\">cc-by-sa-2.0</a>");
	form_el.appendChild(el1);

	domInsertAfter(form_el, document.getElementById("map"));

	OpenLayers.Popup.OPACITY = 0.7;

	OpenLayers.Layer.cdauth.XML.proxy = "gpx.php";
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

	var layerMarkers = new OpenLayers.Layer.cdauth.Markers.LonLat(OpenLayers.i18n("Markers"), { shortName : "m" });
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

	layerResults = new OpenLayers.Layer.cdauth.Markers.GeoSearch(OpenLayers.i18n("Search results"), { nameFinderURL : "namefinder.php", nameFinder2URL : "namefinder2.php", shortName : "s" });
	mapObject.addLayer(layerResults);

	addingLayers = false;
	var hashHandler = new OpenLayers.Control.cdauth.URLHashHandler({
		updateMapView : function() {
			var query_object = decodeQueryString(this.hashHandler.getLocationHash());
			if(query_object.search == "%s")
				delete query_object.search;
			if(typeof query_object.search == "object" && query_object.search.s == "%s")
				delete query_object.search.s;
			if(typeof query_object.search != "undefined" && (typeof query_object.search != "object" || typeof query_object.search.s != "undefined"))
			{
				document.getElementById("search-input").value = (typeof query_object.search == "object" ? query_object.search.s : query_object.search);
				var gpx_layer = geoSearch(true, (typeof query_object.lon != "undefined" && typeof query_object.lat != "undefined"));
				if(gpx_layer)
				{
					delete query_object.search;
					var i=0;
					if(query_object.xml)
					{
						while(typeof query_object.xml[i] != "undefined")
							i++;
					}
					else
						query_object.xml = { };
					query_object.xml[i] = gpx_layer.cdauthURL;
				}
			}
			this.map.zoomToQuery(query_object);
			this.updateLocationHash();
		}
	});
	mapObject.addControl(hashHandler);
	hashHandler.activate();
	hashHandler.updateMapView();

	mapObject.addControl(new OpenLayers.Control.cdauth.GeoLocation());

	layerResults.events.register("searchBegin", mapObject, function(){
		document.getElementById("search-input").disabled = document.getElementById("search-button").disabled = document.getElementById("search-button-reset").disabled = true;
	});
	layerResults.events.register("searchSuccess", mapObject, function(){
		document.getElementById("search-input").disabled = document.getElementById("search-button").disabled = document.getElementById("search-button-reset").disabled = false;
	});
	layerResults.events.register("searchFailure", mapObject, function(evt){
		if(!evt.dontzoom)
			alert(OpenLayers.i18n("No results."));
		document.getElementById("search-input").disabled = document.getElementById("search-button").disabled = document.getElementById("search-button-reset").disabled = false;
	});
}

function geoSearch(onlygpx, dontzoomgpx)
{
	var search = document.getElementById("search-input").value;

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
		layerResults.geoSearch("");

		document.getElementById("search-input").disabled = document.getElementById("search-button").disabled = document.getElementById("search-button-reset").disabled = true;
		var layer = new OpenLayers.Layer.cdauth.XML(null, search, { removableInLayerSwitcher: true });
		mapObject.addLayer(layer);
		layer.events.register("loadend", layer, function() {
			if(!dontzoomgpx)
			{
				var extent = this.getDataExtent();
				if(extent)
					mapObject.zoomToExtent(extent);
			}
			document.getElementById("search-input").disabled = document.getElementById("search-button").disabled = document.getElementById("search-button-reset").disabled = false;
		});
		return layer;
	}
	else if(!onlygpx)
		layerResults.geoSearch(search);

	return false;
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
	"No results." : "No results."
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
	"No results." : "Kein Ergebnis."
});