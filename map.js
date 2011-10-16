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

function initMap()
{
	mapObject = new FacilMap.Map("map");

	// Readd keyboard control without onlyOnMouseOver setting, as the map is full-screen
	var keyboardControl = mapObject.getControlsByClass("FacilMap.Control.KeyboardDefaults")[0];
	if(keyboardControl)
	{
		keyboardControl.deactivate();
		mapObject.removeControl(keyboardControl);
	}
	mapObject.addControl(new FacilMap.Control.KeyboardDefaults({ onlyOnMouseOver : false }));

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

	for(var i=0; i<mapObject.layers.length; i++)
	{
		if(mapObject.layers[i] instanceof FacilMap.Layer.Markers.OpenStreetBugs)
		{
			var osbControl = new OpenLayers.Control.OpenStreetBugs(mapObject.layers[i]);
			mapObject.addControl(osbControl);
			toolbar.addControls(osbControl);
			break;
		}
	}

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
	
	mapObject.addControl(new FacilMap.Control.GeoLocation());
	mapObject.addControl(new FacilMap.Control.Search({ permalinkName : "s" }));
	mapObject.addControl(new FacilMap.Control.HistoryStateHandler({ autoActivate:true }));

	$(".olControlPanel").mouseover(
		function(){ FacilMap.Util.changeOpacity(this, 1); }
	).mouseout(
		function(){ FacilMap.Util.changeOpacity(this, 0.5); }
	).mouseout();
}


OpenLayers.Lang.en = OpenLayers.Util.extend(OpenLayers.Lang.en, {
	"Move map" : "Move map",
	"OpenStreetBugs" : "OpenStreetBugs",
	"Markers" : "Markers"
});

OpenLayers.Lang.de = OpenLayers.Util.extend(OpenLayers.Lang.de, {
	"Move map" : "Karte verschieben",
	"OpenStreetBugs" : "OpenStreetBugs",
	"Markers" : "Marker"
});
