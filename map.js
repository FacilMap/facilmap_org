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

var map;
var layerMarkers;
var layerResults;
var OSMProjection = new OpenLayers.Projection("EPSG:900913");
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
		var hash_obj = decodeQueryString(location.hash.substr(1));
		for(var i in search_obj)
			hash_obj[i] = search_obj[i];
		location.replace(location.pathname+"#"+encodeQueryString(hash_obj));
		return;
	}

	map = new OpenLayers.Map.cdauth("map");

	icon = new OpenLayers.Icon('marker.png', new OpenLayers.Size(21,25), new OpenLayers.Pixel(-9, -25));
	iconHighlight = new OpenLayers.Icon('marker-green.png', new OpenLayers.Size(21,25), new OpenLayers.Pixel(-9, -25));

	map.addAllAvailableLayers();

	layerMarkers = new OpenLayers.Layer.cdauth.markers.LonLat("Markers", icon);
	map.addLayer(layerMarkers);

	layerResults = new OpenLayers.Layer.cdauth.markers.GeoSearch("Search results", "namefinder.php", icon, iconHighlight);
	map.addLayer(layerResults);

	doUpdateLocationHash();
	setInterval(doUpdateLocationHash, 500);

	var click = new OpenLayers.Control.cdauth.MarkerClick(layerMarkers);
	map.addControl(click);
	click.activate();

	map.events.register("move", map, updateLocationHash);
	map.events.register("changebaselayer", map, updateLocationHash);

	layerMarkers.events.register("markerAdded", map, updateLocationHash);
	layerMarkers.events.register("markerRemoved", map, updateLocationHash);

	layerResults.events.register("lastSearchChange", map, updateLocationHash);
	layerResults.events.register("markersChanged", map, updateLocationHash);
	layerResults.events.register("searchBegin", map, function(){
		document.getElementById("search-input").disabled = document.getElementById("search-button").disabled = true;
	});
	layerResults.events.register("searchSuccess", map, function(){
		document.getElementById("search-input").disabled = document.getElementById("search-button").disabled = false;
	});
	layerResults.events.register("searchFailure", map, function(){
		document.getElementById("search-input").disabled = document.getElementById("search-button").disabled = false;
	});
}

function geoSearch()
{
	layerResults.geoSearch(document.getElementById("search-input").value);
}

function updateLocationHash()
{
	newLocationHash = true;
}

function doUpdateLocationHash()
{
	if(newLocationHash)
	{
		location.hash = "#"+encodeQueryString(map.getQueryObject(layerMarkers, layerResults));
		lastHash = location.hash;
	}
	else
	{
		var do_zoom = (location.hash != lastHash);
		lastHash = location.hash;
		if(do_zoom)
		{
			var query_object = decodeQueryString(location.hash.replace(/^#/, ""));
			if(typeof query_object.search != "undefined")
				document.getElementById("search-input").value = query_object.search;
			map.zoomToQuery(query_object, layerMarkers, layerResults);
		}
	}
}

/*
var format;
			if(string.match(/\.gpx$/i))
				format = OpenLayers.Format.GPX;
			else if(string.match(/\.gml$/i))
				format = OpenLayers.Format.GML;
			else if(string.match(/\.osm$/i))
				format = OpenLayers.Format.OSM;
			lastSearchLayer = new OpenLayers.Layer.GML("Geographic file", string, { format: format });
			map.addLayer(lastSearchLayer);
			if(!zoomback)
				map.zoomToExtent(lastSearchLayer.getMaxExtent());
*/