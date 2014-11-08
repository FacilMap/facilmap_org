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

(function(fm, ol, $) {

window.initMap = function()
{
	window.mapObject = new fm.Map("map");

	// Readd keyboard control without onlyOnMouseOver setting, as the map is full-screen
	var keyboardControl = mapObject.getControlsByClass("FacilMap.Control.KeyboardDefaults")[0];
	if(keyboardControl)
	{
		keyboardControl.deactivate();
		mapObject.removeControl(keyboardControl);
	}
	mapObject.addControl(new fm.Control.KeyboardDefaults({ onlyOnMouseOver : false }));

	mapObject.addAllAvailableLayers();
	mapObject.addLayer(new fm.Layer.CoordinateGrid(null, { visibility: false, shortName: "grid" }));

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

	mapObject.addControl(new fm.Control.GeoLocation());
	mapObject.addControl(new fm.Control.Search({ permalinkName : "s" }));

	mapObject.addControl(new FacilMap.Control.ToolsMenu.Default());
	
	var historyStateHandler = new fm.Control.HistoryStateHandler({ autoActivate: true, prefixWithMapId: false });
	// Patch q parameter for searching
	historyStateHandler.stateHandler.getState = function() {
		var obj = fm.HistoryStateHandler.prototype.getState.apply(this, arguments);
		if(obj.q)
		{
			if(!obj.c) obj.c = { };
			if(!obj.c.s) obj.c.s = { };

			if(typeof obj.q == "string") {
				var q = obj.q.split(/\s+to\s+/i);
				if(q.length == 1)
					obj.c.s.query = q[0];
				else
					obj.c.s.query = q;
			} else {
				obj.c.s.query = obj.q;
			}

			if(obj.lon == undefined && obj.lat == undefined && obj.zoom == undefined)
				obj.c.s.zoom = "1";
			delete obj.q;
		}
		return obj;
	};
	historyStateHandler.stateHandler.setState = function(obj) {
		if(obj && obj.c && obj.c.s) {
			if(obj.c.s.query != null) {
				obj.q = obj.c.s.query;
				delete obj.c.s.query;
			} else if(obj.c.s.from != null && obj.c.s.to != null) {
				obj.q = obj.c.s.from+" to "+obj.c.s.to;
				delete obj.c.s.from;
				delete obj.c.s.to;
			}
		}
		fm.HistoryStateHandler.prototype.setState.apply(this, [ obj ]);
	};
	mapObject.addControl(historyStateHandler);
	
	$(".olMap .fmControlSearch .from").attr("name", "q");

	$(".olControlPanel").mouseover(
		function(){ fm.Util.changeOpacity(this, 1); }
	).mouseout(
		function(){ fm.Util.changeOpacity(this, 0.5); }
	).mouseout();
}


ol.Lang.en = ol.Util.extend(ol.Lang.en, {
	"Move map" : "Move map",
	"OpenStreetBugs" : "OpenStreetBugs",
	"Markers" : "Markers"
});

ol.Lang.de = ol.Util.extend(ol.Lang.de, {
	"Move map" : "Karte verschieben",
	"OpenStreetBugs" : "OpenStreetBugs",
	"Markers" : "Marker"
});

})(FacilMap, OpenLayers, FacilMap.$);