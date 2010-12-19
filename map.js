/*
	This file is part of FacilMap.

	FacilMap is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	FacilMap is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with FacilMap.  If not, see <http://www.gnu.org/licenses/>.

	Obtain the source code from http://gitorious.org/facilmap.
*/

var esc = FacilMap.Util.htmlspecialchars;
var _ = OpenLayers.i18n;

var mapObject;
var layerResults;
var layerRouting;
var nameFinder;
var searchResults;
var searchTargetResults;
var isRoutingSearch = false;

function initMap()
{
	$("#map").after('<form method="get" action="" id="search">' +
		'<dl>' +
			'<dt><label for="search-input">'+esc(_("Search"))+'</label></dt>' +
			'<dd><input type="text" id="search-input" name="q" title="'+esc(_("Enter a search string, a URL of a GPX, KML, OSM or GML file or an OSM object like “node 123” or “trace 123”."))+'" /></dd>' +
			'<dt><label for="search-target-input">'+esc(_("Destination"))+'</label></dt>' +
			'<dd><input type="text" id="search-target-input" name="target" /><dd>' +
		'</dl>' +
		'<ul>' +
			'<li><input type="submit" id="search-button" value="'+esc(_("Search"))+'" /></li>' +
			'<li><input type="button" id="search-button-reset" value="'+esc(_("Clear"))+'" /></li>' +
			'<li><select id="search-route-type">' +
				'<option value="'+esc(FacilMap.Routing.Type.FASTEST)+'">'+esc(_("Fastest"))+'</option>' +
				'<option value="'+esc(FacilMap.Routing.Type.SHORTEST)+'">'+esc(_("Shortest"))+'</option>' +
			'</select></li>' +
			'<li><select id="search-route-medium">' +
				'<option value="'+esc(FacilMap.Routing.Medium.CAR)+'">'+esc(_("Car"))+'</option>' +
				'<option value="'+esc(FacilMap.Routing.Medium.BICYCLE)+'">'+esc(_("Bicycle"))+'</option>' +
				'<option value="'+esc(FacilMap.Routing.Medium.FOOT)+'">'+esc(_("Foot"))+'</option>' +
			'</select></li>' +
		'</ul>' +
		'<div id="search-toggle-routing"><a href="javascript:undefined"> </a></div>' + // Text is added in hideRoutingForm()
		'<p id="search-osm-cc">'+_("Search results from <a href=\"http://www.openstreetmap.org/\">OpenStreetMap</a>, <a href=\"http://creativecommons.org/licenses/by-sa/2.0/\">cc-by-sa-2.0</a>")+'</p>' +
		'<ul id="search-route-info"></ul>' +
		'<div id="search-results-toggle"><a href="javascript:undefined">'+esc(_("Hide results"))+'</a></div>' +
		'<div id="search-results"></div>' +
		'<div id="search-target-results"></div>'
	);

	$("#search").submit(
		function(){ geoSearch(); return false; }
	).mouseover(
		function(){ FacilMap.Util.changeOpacity(this, 1); FacilMap.Util.changeOpacity($("#search-osm-cc")[0], 1); }
	).mouseout(
		function(){ FacilMap.Util.changeOpacity(this, 0.5); FacilMap.Util.changeOpacity($("#search-osm-cc")[0], 0.3); }
	).mouseout();
	$("#search-button-reset").click(function(){ $("#search-input,#search-target-input").val(""); $(this.form).submit(); return false; });

	var switchType = function() { if(layerRouting != null && layerRouting.provider.routingType != this.value) layerRouting.setType(this.value); };
	$("#search-route-type").bind({ 'change' : switchType, 'keyup' : switchType, 'click' : switchType });
	var switchMedium = function() { if(layerRouting != null && layerRouting.provider.medium != this.value) layerRouting.setMedium(this.value); };
	$("#search-route-medium").bind({ 'change' : switchMedium, 'keyup' : switchMedium, 'click' : switchMedium });

	$("#search-results-toggle,#search-results,#search-target-results,#search-route-info").css("display", "none");

	$("#search-results-toggle a").click(function() {
		if($("#search-results").css("display") == "none")
		{
			this.firstChild.data = _("Show results");
			$("#search-results").css("display", "block");
			if($("#search-target-input").css("display") != "none")
				$("#search-target-results").css("display", "block");
		}
		else
		{
			this.firstChild.data = _("Hide results");
			$("#search-results,#search-target-results").css("display", "none");
		}
	});

	searchResults = document.createElement("ol");
	$("#search-results").append(searchResults);
	searchTargetResults = document.createElement("ol");
	$("#search-target-results").append(searchTargetResults);

	hideRoutingForm();

	OpenLayers.Popup.OPACITY = 0.7;

	mapObject = new FacilMap.Map("map");

	var addingLayers = true;
	mapObject.setBaseLayer = function(layer) {
		if(addingLayers)
		{ // Prevent loading the default base layer if another layer will be set initially by the Permalink
			layer.setVisibility(false);
			return;
		}
		FacilMap.Map.prototype.setBaseLayer.apply(this, arguments);
	};

	mapObject.addAllAvailableLayers();
	mapObject.addLayer(new FacilMap.Layer.CoordinateGrid(null, { visibility: false, shortName: "grid" }));

	var activeTool = null;
	var cookies = document.cookie.split(/;\s*/);
	for(var i=0; i<cookies.length; i++)
	{
		var cookie = cookies[i].split("=");
		if(cookie[0] == "fmTool")
		{
			activeTool = decodeURIComponent(cookie[1]);
			break;
		}
	}

	var toolbar = new OpenLayers.Control.Panel();
	var moveControl = new OpenLayers.Control({ title : _("Move map") });
	mapObject.addControl(moveControl);
	toolbar.addControls(moveControl);
	toolbar.defaultControl = moveControl;

	var osb = new OpenLayers.Layer.OpenStreetBugs(_("OpenStreetBugs"), { visibility: false, theme: null, shortName: "OSBu" });
	mapObject.addLayer(osb);

	var osbControl = new OpenLayers.Control.OpenStreetBugs(osb);
	mapObject.addControl(osbControl);
	toolbar.addControls(osbControl);

	var layerMarkers = new FacilMap.Layer.Markers.LonLat(_("Markers"), { shortName : "m", saveInPermalink : true });
	mapObject.addLayer(layerMarkers);
	var markerControl = new FacilMap.Control.CreateMarker(layerMarkers);
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

		document.cookie = "fmTool="+encodeURIComponent(control.title)+";expires="+(new Date((new Date()).getTime() + 86400000000)).toGMTString();
		return ret;
	};

	nameFinder = new FacilMap.NameFinder.Nominatim();
	layerResults = new FacilMap.Layer.Markers.GeoSearch(_("Search results"), nameFinder, { shortName : "s", saveInPermalink : true });
	mapObject.addLayer(layerResults);

	nameFinder.initAutoSuggest($("#search-input")[0]);
	nameFinder.initAutoSuggest($("#search-target-input")[0]);

	addingLayers = false;
	var hashHandler = new FacilMap.Control.URLHashHandler({
		updateMapView : function() {
			var query_object = FacilMap.Util.decodeQueryString(this.hashHandler.getLocationHash());

			if(query_object.q != undefined && query_object.q != "%s")
			{
				if(query_object.target != undefined && query_object.target != "%s")
				{
					showRoutingForm();
					$("#search-target-input").val(query_object.target);
					if(query_object.l != undefined && query_object.l.r != undefined)
						delete query_object.l.r;
				}
				$("#search-input").val(query_object.q);
				if(query_object.l != undefined && query_object.l.s != undefined)
					delete query_object.l.s;
				geoSearch();
			}

			if(query_object.l != undefined && query_object.l.s != undefined)
				$("#search-input").val(query_object.l.s.search);

			if(query_object.l != undefined && query_object.l.r != undefined)
			{
				showRoutingForm();
				createRoutingLayer();

				if(query_object.l.r.type != undefined)
					$("#search-route-type").val(query_object.l.r.type);
				if(query_object.l.r.medium != undefined)
					$("#search-route-medium").val(query_object.l.r.medium);
				if(query_object.l.r.from != undefined && query_object.l.r.from.lon != undefined && query_object.l.r.from.lat != undefined)
					$("#search-input").val(query_object.l.r.from.lat+","+query_object.l.r.from.lon);
				if(query_object.l.r.to != undefined && query_object.l.r.to.lon != undefined && query_object.l.r.to.lat != undefined)
					$("#search-target-input").val(query_object.l.r.to.lat+","+query_object.l.r.to.lon);
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

	mapObject.addControl(new FacilMap.Control.GeoLocation());

	$(".olControlPanel").mouseover(
		function(){ FacilMap.Util.changeOpacity(this, 1); }
	).mouseout(
		function(){ FacilMap.Util.changeOpacity(this, 0.5); }
	).mouseout();
}

function onSearchStart()
{
	var els = $("#search input,#search select");
	for(var i=0; i<els.length; i++)
		els[i].disabled = true;
}

function onSearchEnd()
{
	var els = $("#search input,#search select");
	for(var i=0; i<els.length; i++)
		els[i].disabled = false;
}

function createRoutingLayer()
{
	if(layerRouting == null)
	{
		layerRouting = new FacilMap.Layer.XML.Routing(_("Directions"), { shortName : "r", saveInPermalink : true });
		mapObject.addLayer(layerRouting);

		layerRouting.setType($("#search-route-type").val());
		layerRouting.setMedium($("#search-route-medium").val());

		layerRouting.events.register("loadstart", layerRouting, function() {
			onSearchStart();
			$("#search-route-info").css("display", "none");
		});
		layerRouting.events.register("allloadend", layerRouting, function() {
			onSearchEnd();

			var distance = this.getDistance();
			var duration = this.getDuration();
			var detailedLink = this.getDetailedLink();

			var info = $("#search-route-info");
			info.empty().css("display", "block");

			if(distance != null)
				info.append('<li>'+esc(_("Distance"))+': '+(Math.round(distance*10)/10)+"\u2009"+'<abbr title="'+esc(_("kilometers"))+'">km</abbr></li>');

			if(duration != null)
			{
				var minutes = Math.round(duration*60)%60;
				if(minutes < 10)
					minutes = "0"+minutes;
				info.append('<li>'+esc(_("Duration"))+': '+Math.floor(duration)+':'+minutes+"\u2009"+'<abbr title="'+esc(_("hours"))+'">h</abbr></li>');
			}

			if(detailedLink != null)
				info.append('<li><a href="'+esc(detailedLink)+'">'+esc(_("Detailed driving instructions"))+'</a></li>');

			if(layerRouting.provider.reorderViaPoints != FacilMap.Routing.prototype.reorderViaPoints && layerRouting.provider.via.length >= 2)
			{
				info.append('<li><a href="#" id="search-optimise-link">'+esc(_("Optimise route points"))+'</a></li>');
				$("#search-optimise-link").click(function() {
					onSearchStart();
					layerRouting.reorderViaPoints(function(error) {
						if(error) alert(error);
						onSearchEnd();
					});
					return false;
				});
			}
		});
		layerRouting.events.register("draggedRoute", layerRouting, function() {
			$("#search-input").val(this.provider.from.lat+","+this.provider.from.lon);
			$("#search-target-input").val(this.provider.to.lat+","+this.provider.to.lon);
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
	$("#search-route-type,#search-route-medium").parent().css("display", "inline");
	$("#search-target-input").css("display", "block");
	$("#search-target-results").css("display", $("#search-results").css("display"));
	$("#search-button").val(_("Get directions"));
	$("#search-toggle-routing a").text(_("Hide directions")).click(function() { hideRoutingForm(); });
}

function hideRoutingForm()
{
	$("#search-route-type,#search-route-medium").parent().add("#search-target-input").css("display", "none");
	$("#search-button").val(_("Search"));
	$("#search-toggle-routing a").text(_("Get directions")).click(function() { showRoutingForm(); });

	if(layerRouting)
	{
		removeRoutingLayer();
		var search = $("#search-input").val();
		$("#search-input").val("");
		geoSearch();
		$("#search-input").val(search);
	}
}

function geoSearch()
{
	var search = $("#search-input").val().replace(/^\s+/, "").replace(/\s+$/, "");
	var searchTarget = $("#search-target-input").val().replace(/^\s+/, "").replace(/\s+$/, "");
	layerResults.showResults([ ]);
	$("#search-results-toggle,#search-results,#search-target-results,#search-route-info").css("display", "none");
	$(searchResults).add(searchTargetResults).empty();

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
			var query_string = FacilMap.Util.decodeQueryString(m[1]);
			if(query_string.lon == undefined || query_string.lat == undefined)
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
		var layer = new FacilMap.Layer.XML(null, search, { removableInLayerSwitcher: true, saveInPermalink : true });
		mapObject.addLayer(layer);
		layer.events.register("loadend", layer, function() {
			var extent = this.getDataExtent();
			if(extent)
				mapObject.zoomToExtent(extent);
		});
		layer.events.register("allloadend", layer, function() {
			onSearchEnd();
		});
	}
	else
	{
		if(searchTarget != "" && $("#search-target-input").css("display") != "none")
		{
			isRoutingSearch = true;
			createRoutingLayer();
		}

		var searchCallback = function(results){
			if(!isRoutingSearch)
				layerResults.showResults(results, search);

			if(results == undefined || results.length == 0)
				alert(_("No results."));
			else
			{
				for(var i=0; i<results.length; i++) (function(i)
				{
					results[i].showOnMap = function() {
						for(var j=0; j<layerResults.markers.length; j++)
							layerResults.markers[j].fmFeature.popup.hide();
						if(isRoutingSearch)
							layerRouting.setFrom(this.lonlat, true);
						else
						{
							this.marker.fmFeature.popup.show();
							mapObject.setCenter(this.lonlat.clone().transform(new OpenLayers.Projection("EPSG:4326"), mapObject.getProjectionObject()), this.getZoom(mapObject));
						}
					};

					if(results.length > 1)
					{
						$(searchResults).append("<li><a href=\"javascript:undefined\" id=\"search-result-"+i+"\">"+esc(results[i].name)+"</a> <span class=\"search-result-info\">("+esc(results[i].info)+")</span></li>");
						$("#search-result-"+i).click(function() { results[i].showOnMap() });
					}
				})(i);

				if(isRoutingSearch)
					results[0].showOnMap();

				if(results.length > 1)
				{
					$("#search-results-toggle,#search-results").css("display", "block");
					if($("#search-target-input").css("display") != "none")
						$("#search-target-results").css("display", "block");
				}
			}

			if(results == undefined || results.length == 0 || !isRoutingSearch)
				onSearchEnd();
		};

		/*if($("#search-input")[0].fmAutocompleteSelected != null)
			searchCallback([ $("#search-input")[0].fmAutocompleteSelected ]);
		else*/
			nameFinder.find(search, searchCallback);

		if(isRoutingSearch)
		{
			var searchTargetCallback = function(results){
				if(results == undefined || results.length == 0)
				{
					alert(_("No results."));
					onSearchEnd();
				}
				else
				{
					for(var i=0; i<results.length; i++) (function(i)
					{
						results[i].showOnMap = function() {
							layerRouting.setTo(this.lonlat, true);
						};

						if(results.length > 1)
						{
							$(searchTargetResults).append("<li><a href=\"javascript:undefined\" id=\"search-target-result-"+i+"\">"+esc(results[i].name)+"</a> <span class=\"search-result-info\">("+esc(results[i].info)+")</span></li>");
							$("#search-target-result-"+i).click(function() { results[i].showOnMap() });
						}
					})(i);
				}

				results[0].showOnMap();

				if(results.length > 1)
					$("#search-results-toggle,#search-results,#search-target-results").css("display", "block");
			};

			/*if($("#search-target-input")[0].fmAutocompleteSelected != null)
				searchTargetCallback([ $("#search-target-input")[0].fmAutocompleteSelected ]);
			else*/
				nameFinder.find(searchTarget, searchTargetCallback);
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
	"hours" : "hours",
	"Optimise route points" : "Optimise route points"
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
	"hours" : "Stunden",
	"Optimise route points" : "Routenpunkte optimieren"
});
