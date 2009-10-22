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

// TODO: Also translate layer names (at the moment not possible due to the use of layer names in the URL hash part

var map;
var layerMarkers;
var layerResults;
var lastHash;
var newLocationHash;
var icon;
var iconHighlight;
var lastSearch;
var lastSearchLayer;

function initMap()
{
	if(location.search.length > 1)
	{ // Move query string to location hash part
		var search_obj = decodeQueryString(location.search.substr(1));
		var hash_obj = decodeQueryString(getLocationHash().substr(1));
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

	OpenLayers.Layer.cdauth.XML.proxy = "gpx.php";
	map = new OpenLayers.Map.cdauth("map");

	icon = new OpenLayers.Icon('marker.png', new OpenLayers.Size(21,25), new OpenLayers.Pixel(-9, -25));
	iconHighlight = new OpenLayers.Icon('marker-green.png', new OpenLayers.Size(21,25), new OpenLayers.Pixel(-9, -25));

	map.addAllAvailableLayers();

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
	map.addControl(moveControl);
	toolbar.addControls(moveControl);
	toolbar.defaultControl = moveControl;

	var osb = new OpenLayers.Layer.OpenStreetBugs("OpenStreetBugs", { visibility: false });
	map.addLayer(osb);

	var osbControl = new OpenLayers.Control.OpenStreetBugs(osb);
	map.addControl(osbControl);
	toolbar.addControls(osbControl);

	layerMarkers = new OpenLayers.Layer.cdauth.markers.LonLat("Markers");
	map.addLayer(layerMarkers);
	var markerControl = new OpenLayers.Control.cdauth.CreateMarker(layerMarkers);
	map.addControl(markerControl);
	toolbar.addControls(markerControl);

	map.addControl(toolbar);
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

	layerResults = new OpenLayers.Layer.cdauth.markers.GeoSearch("Search results", "namefinder.php", icon, iconHighlight);
	map.addLayer(layerResults);

	doUpdateLocationHash();
	setInterval(doUpdateLocationHash, 500);
	map.events.register("newHash", map, updateLocationHash);

	layerResults.events.register("searchBegin", map, function(){
		document.getElementById("search-input").disabled = document.getElementById("search-button").disabled = document.getElementById("search-button-reset").disabled = true;
	});
	layerResults.events.register("searchSuccess", map, function(){
		document.getElementById("search-input").disabled = document.getElementById("search-button").disabled = document.getElementById("search-button-reset").disabled = false;
	});
	layerResults.events.register("searchFailure", map, function(){
		document.getElementById("search-input").disabled = document.getElementById("search-button").disabled = document.getElementById("search-button-reset").disabled = false;
	});

	//makeShortCode(51.511, 0.055, 9);
	//decodeShortLink("0EEQjE==");
}

function geoSearch(onlygpx, dontzoomgpx)
{
	var search = document.getElementById("search-input").value;

	var gpx = false;
	if(search.match(/^http:\/\//))
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
				case "relation": search = "http://osm.cdauth.de/route-manager/gpx.php?relation="+m[2]; break;
				case "trace": search = "http://www.openstreetmap.org/trace/"+m[2]+"/data"; break;
			}
		}
	}

	if(gpx)
	{
		layerResults.geoSearch("");

		document.getElementById("search-input").disabled = document.getElementById("search-button").disabled = document.getElementById("search-button-reset").disabled = true;
		var layer = new OpenLayers.Layer.cdauth.XML(null, search, { removableInLayerSwitcher: true });
		map.addLayer(layer);
		layer.events.register("loadend", layer, function() {
			if(!dontzoomgpx)
			{
				var extent = this.getDataExtent();
				if(extent)
					map.zoomToExtent(extent);
			}
			document.getElementById("search-input").disabled = document.getElementById("search-button").disabled = document.getElementById("search-button-reset").disabled = false;
		});
		return layer;
	}
	else if(!onlygpx)
		layerResults.geoSearch(search);

	return false;
}

function updateLocationHash()
{
	newLocationHash = true;
}

/**
 * At least in Firefox, location.hash contains “&” if the hash part contains “%26”. This makes searching for URLs (such as OSM PermaLinks) hard and we work around that problem by extracting the desired value from location.href.
*/

function getLocationHash()
{
	var match = location.href.match(/#(.*)$/);
	if(match)
		return match[1];
	else
		return "";
}

function doUpdateLocationHash()
{
	if(newLocationHash)
	{
		location.hash = "#"+encodeQueryString(map.getQueryObject(layerMarkers, layerResults));
		lastHash = getLocationHash();
		newLocationHash = false;
	}
	else
	{
		var do_zoom = (getLocationHash() != lastHash);
		lastHash = getLocationHash();
		if(do_zoom)
		{
			var query_object = decodeQueryString(lastHash);
			if(query_object.search == "%s")
				delete query_object.search;
			if(typeof query_object.search != "undefined")
			{
				document.getElementById("search-input").value = query_object.search;
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
			map.zoomToQuery(query_object, layerMarkers, layerResults);
		}
	}
}

OpenLayers.Lang.en = OpenLayers.Util.extend(OpenLayers.Lang.en, {
	"Move map" : "Move map",
	"Search" : "Search",
	"Enter a search string, a URL of a GPX, KML, OSM or GML file or an OSM object like “node 123” or “trace 123”." : "Enter a search string, a URL of a GPX, KML, OSM or GML file or an OSM object like “node 123” or “trace 123”.",
	"Clear" : "Clear",
	"Search results from <a href=\"http://www.openstreetmap.org/\">OpenStreetMap</a>, <a href=\"http://creativecommons.org/licenses/by-sa/2.0/\">cc-by-sa-2.0</a>" : "Search results from <a href=\"http://www.openstreetmap.org/\">OpenStreetMap</a>, <a href=\"http://creativecommons.org/licenses/by-sa/2.0/\">cc-by-sa-2.0</a>"
});

OpenLayers.Lang.de = OpenLayers.Util.extend(OpenLayers.Lang.de, {
	"Move map" : "Karte verschieben",
	"Search" : "Suchen",
	"Enter a search string, a URL of a GPX, KML, OSM or GML file or an OSM object like “node 123” or “trace 123”." : "Ein Suchbegriff, eine URL einer GPX-, KML- OSM- oder GML-Datei oder ein OSM-Objekt wie „node 123“, „way 123“, „relation 123“ oder „trace 123“",
	"Clear" : "Löschen",
	"Search results from <a href=\"http://www.openstreetmap.org/\">OpenStreetMap</a>, <a href=\"http://creativecommons.org/licenses/by-sa/2.0/\">cc-by-sa-2.0</a>" : "Suchergebnisse aus <a href=\"http://www.openstreetmap.org/\">OpenStreetMap</a>, <a href=\"http://creativecommons.org/licenses/by-sa/2.0/\">cc-by-sa-2.0</a>"
});