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

	OpenLayers.Layer.cdauth.XML.proxy = "gpx.php";
	map = new OpenLayers.Map.cdauth("map");

	icon = new OpenLayers.Icon('marker.png', new OpenLayers.Size(21,25), new OpenLayers.Pixel(-9, -25));
	iconHighlight = new OpenLayers.Icon('marker-green.png', new OpenLayers.Size(21,25), new OpenLayers.Pixel(-9, -25));

	map.addAllAvailableLayers();

	map.addLayer(new OpenLayers.Layer.cdauth.markers.OpenStreetBugs("OpenStreetBugs", "openstreetbugs.php", { visibility: false }));

	layerMarkers = new OpenLayers.Layer.cdauth.markers.LonLat("Markers");
	map.addLayer(layerMarkers);
	layerMarkers.addClickControl();

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
}

function geoSearch(onlygpx)
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
			if(!onlygpx)
			{
				var extent = this.getDataExtent();
				if(extent)
					map.zoomToExtent(extent);
			}
			document.getElementById("search-input").disabled = document.getElementById("search-button").disabled = document.getElementById("search-button-reset").disabled = false;
		});
	}
	else if(!onlygpx)
		layerResults.geoSearch(search);
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
		newLocationHash = false;
	}
	else
	{
		var do_zoom = (location.hash != lastHash);
		lastHash = location.hash;
		if(do_zoom)
		{
			var query_object = decodeQueryString(location.hash.replace(/^#/, ""));
			if(typeof query_object.search != "undefined")
			{
				document.getElementById("search-input").value = query_object.search;
				delete query_object.search;
				geoSearch(true);
			}
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
