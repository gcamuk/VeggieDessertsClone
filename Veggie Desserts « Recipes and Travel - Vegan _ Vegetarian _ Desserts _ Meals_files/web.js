
(function() {
    // Dynamic values from page request
    
var script = document.getElementById("celtra-script-1");
if (!script || script.tagName.toLowerCase() !== 'script')
    throw 'Element with id equal to scriptId does not exist or is not a script.';
  
    var runtimeParams = {"tagVersion":"6","deviceInfo":{"deviceType":"Desktop","primaryHardwareType":"Desktop","mobileDevice":false,"osName":"OSX","osVersion":"10.14.4","platform":"DesktopPlatform","platformVersion":null,"browserName":"Chrome","browserVersion":"74.0.3729.169","browserRenderingEngine":"WebKit","vendor":"Google","model":"Chrome - OS X"},"weather":{"windy":"0","currentCondition":"cloudy","apparentTemperature":18.0,"temperature":18.33,"windSpeed":4,"cloudCoverage":44,"conditions":[{"name":"cloudy","weight":0}]},"ipCountryCode":"GB","ipRegionCode":null,"ipPrincipalSubdivisionCode":"ENG","ipCityGeonameId":"2643097","ipCity":"Mansfield","ipPostalCode":"NG19","ipLat":53.169,"ipLng":-1.2205,"accountId":"82b99a5d","folderId":"0fd01a81","placementId":"3e22fd77","supplierId":"4e25b08a","sessionId":"s1559215636x44404ad788dee3x40227405","purpose":"live","secure":1,"clientTimestamp":"1559215600.266","clientTimeZoneOffsetInMinutes":-60,"clientIp":"92.207.104.197","gpsLat":null,"gpsLng":null,"language":"en","acceptLanguage":"en-GB,en-US;q=0.9,en;q=0.8","platformAdvId":null,"platformAdvIdTrackingLimited":null,"userIdentifiers":{},"variantChoices":{"UseNewUnitViewabilityLogic":"newGeometryWithSampling"},"neustarSegment":null,"authBasis":"1559215636134,2606df4f,3e22fd77","authToken":"6de971f9c505a71cd0de2edda860fcf9","customAudiences":{},"derivedAudiences":{},"destinationDefinitions":[{"campaignId":null,"placementId":"3e22fd77","creativeId":null,"eventName":"urlOpened","reportLabel":"ct_background","destinationUrl":"https://ad.doubleclick.net/ddm/trackclk/N410415.1138338CAPTIFY.CO.UK/B22527022.246738552;dc_trk_aid=443071631;dc_trk_cid=116032373;dc_lat=;dc_rdid=;tag_for_child_directed_treatment=;tfua=\n ","destination":{"url":"https://ad.doubleclick.net/ddm/trackclk/N410415.1138338CAPTIFY.CO.UK/B22527022.246738552;dc_trk_aid=443071631;dc_trk_cid=116032373;dc_lat=;dc_rdid=;tag_for_child_directed_treatment=;tfua=\n ","clazz":"Fixed"},"impressionUrl":null}],"dynamicContent":[],"tuneIosQueryStringFragment":null,"tuneAndroidQueryStringFragment":null,"tuneCustomAttributes":{},"admarvel_format":null,"overrides":{"placementId":"3e22fd77","customAudiences":{},"derivedAudiences":{},"deviceInfo":{"deviceType":"Desktop","primaryHardwareType":"Desktop","mobileDevice":false,"osName":"OSX","osVersion":"10.14.4","platform":"DesktopPlatform","platformVersion":null,"browserName":"Chrome","browserVersion":"74.0.3729.169","browserRenderingEngine":"WebKit","vendor":"Google","model":"Chrome - OS X"},"language":"en","ipCountryCode":"GB","ipRegionCode":null,"ipPrincipalSubdivisionCode":"ENG","ipCityGeonameId":"2643097","ipCity":"Mansfield","weather":{"windy":"0","currentCondition":"cloudy","apparentTemperature":18.0,"temperature":18.33,"windSpeed":4,"cloudCoverage":44,"conditions":[{"name":"cloudy","weight":0}]},"clientTimestamp":"1559215600.266","clientTimeZoneOffsetInMinutes":-60},"utSignals":null,"_mraidCheck":null,"externalAdServer":"AppNexus","externalCreativeId":"160155838","externalCreativeName":null,"externalPlacementId":"8055627","externalPlacementName":null,"externalSiteId":"1385531","externalSiteName":"https://veggiedesserts.co.uk/","externalSupplierId":"615189","externalSupplierName":null,"externalLineItemId":null,"externalSessionId":"5026084025310440891","externalBundleId":null,"externalCreativeWidth":300,"externalCreativeHeight":600,"externalCampaignId":"30016701","externalCampaignName":null,"externalAdvertiserId":null,"clickUrl":"https://ams1-ib.adnxs.com/click?xVBOtKuQ8z9IemLnt0nwPwAAAGCPQiNASHpi57dJ8D_FUE60q5DzP7vt5KvKPMBFkMYR0QJ5Ew7xve9cAAAAADalWgBMBQAAWAQAAAIAAAC-yIsJuXMLAAAAAABVU0QAVVNEACwBWAJM4gAAAAABAQUCAAAAALYAoSeS-AAAAAA./cpcpm=AAAAAAAAAAA=/bcr=AAAAAAAA8D8=/cnd=%21kxTS1wi6sqMOEL6Rr0wYuectIAAoADEAAAAAAAAYQDoJQU1TMTozOTgxQOIMScf0hCUeUOk_Udv5fmq8dLM_WQAAAAAAAAAA/cca=MTExMiNBTVMxOjM5ODE=/bn=83993/clickenc=","useClickAsDestination":null,"scriptId":"celtra-script-1","firehoseUrl":null,"clickEvent":"advertiser","clickUrlNeedsDest":null,"ncu":null,"firstPage":1,"dataURIsEnabled":0,"universalAndAppLinksInMRAID":0,"monotypeProjectId":"c46ed090-3671-4163-a85b-b06b4038ae38","iosAdvId":null,"iosAdvIdTrackingLimited":null,"androidAdvId":null,"androidAdvIdTrackingLimited":null,"moatRandom":{"first":2108629677,"second":1262995443},"skipOffset":null,"_enablePoliteLoading":null,"_politeImageUrl":null,"_politeClickThrough":null,"sticky":null,"_mopubExt":null,"enabledServices":[],"vastCompanion":0,"creativeVariantLockSize":null,"vastVersion":null,"country":"GB","productCategoryCode":null,"campaignName":"Casumo","agencyId":null,"customPartnerAttributeBrandId":null,"preferredClickThroughWindow":"new","externalCreativeSize":"300x600","expandDirection":"undefined","hostPageLoadId":"7992774372796607"};
    runtimeParams.overridableClickThroughDestinationUrl = false;
    runtimeParams.redirectJsClientTimestamp = new Date() / 1000;
    
    
var macros = function (x) {
    if (x instanceof Array) {
        return x.map(macros);
    } else {
        var macroTags = [
            ['%%CACHEBUSTER%%', (Math.random()+'').slice(2)]
,['%n', (Math.random()+'').slice(2)]
,['%s', "https"]
,['{celtraAccountId}', "82b99a5d"]
,['{celtraAgencyId}', ""]
,['{celtraAndroidAdvIdTrackingLimitedBoolStr}', ""]
,['{celtraAndroidAdvIdTrackingLimited}', ""]
,['{celtraAndroidAdvId}', ""]
,['{celtraCampaignId:int}', "265296513"]
,['{celtraCampaignId}', "0fd01a81"]
,['{celtraCampaignName}', "Casumo"]
,['{celtraCountryCode}', "GB"]
,['{celtraCreativeId:int}', "637984591"]
,['{celtraCreativeId}', "2606df4f"]
,['{celtraCreativeVariant:urlenc}', ""]
,['{celtraCreativeVariant}', ""]
,['{celtraCustomPartnerAttribute\\[code\\]}', ""]
,['{celtraExternalAdServer}', "AppNexus"]
,['{celtraExternalAdvertiserId}', ""]
,['{celtraExternalBundleId}', ""]
,['{celtraExternalCampaignId}', "30016701"]
,['{celtraExternalCampaignName}', ""]
,['{celtraExternalCreativeId}', "160155838"]
,['{celtraExternalCreativeName}', ""]
,['{celtraExternalLineItemId}', ""]
,['{celtraExternalPlacementId}', "8055627"]
,['{celtraExternalPlacementName}', ""]
,['{celtraExternalSessionId}', "5026084025310440891"]
,['{celtraExternalSiteId}', "1385531"]
,['{celtraExternalSiteName}', "https://veggiedesserts.co.uk/"]
,['{celtraExternalSupplierId}', "615189"]
,['{celtraExternalSupplierName}', ""]
,['{celtraIosAdvIdTrackingLimitedBoolStr}', ""]
,['{celtraIosAdvIdTrackingLimited}', ""]
,['{celtraIosAdvId}', ""]
,['{celtraPlacementId:int}', "1042480503"]
,['{celtraPlacementId}', "3e22fd77"]
,['{celtraPlatformAdvIdTrackingLimited}', ""]
,['{celtraPlatformAdvId}', ""]
,['{celtraProductCategoryCode}', ""]
,['{celtraProto}', "https"]
,['{celtraRandom}', (Math.random()+'').slice(2)]
,['{celtraSessionId}', "s1559215636x44404ad788dee3x40227405"]
,['{celtraSupplierId:int}', "1311092874"]
,['{celtraSupplierId}', "4e25b08a"]

        ];
        return macroTags.reduce(function(str, replacementRule, idx, arr) {
            return str.replace(new RegExp(replacementRule[0], 'ig'), replacementRule[1] ? replacementRule[1] : '');
        }, x);
    }
};

    // Dynamic values that we do not want to pass forward in urls,
    // so we look them up on every page request based on runtimeParams
    var urlOpenedOverrideUrls = {"ct_background":"https://ad.doubleclick.net/ddm/trackclk/N410415.1138338CAPTIFY.CO.UK/B22527022.246738552;dc_trk_aid=443071631;dc_trk_cid=116032373;dc_lat=;dc_rdid=;tag_for_child_directed_treatment=;tfua=\n "};
    var storeOpenedOverrideUrls = {};
    var urlOpenedUrlAppendage = "";
    var clickThroughDestinationUrl = null;

    // Less dynamic values for payload request
    var payloadBase = "https://cache-ssl.celtra.com/api/creatives/2606df4f/compiled/web.js";
    var cacheParams = {"v": "5-f241a5e810", "secure": 1, "cachedVariantChoices": "W10-", "inmobi": typeof imraid !== 'undefined' && typeof _im_imai !== 'undefined' ? '1' : '0'};

    
    var trackers = (function() {
    return [
        // 3rd-party tracker (regular)
function(event) {
    if (event.name == 'adLoading')
        return {urls: macros([])};

    if (event.name == 'firstInteraction')
        return {urls: macros([])};

    if (event.name == 'creativeLoaded')
        return {urls: macros(["https://ad.doubleclick.net/ddm/trackimp/N410415.1138338CAPTIFY.CO.UK/B22527022.246738552;dc_trk_aid=443071631;dc_trk_cid=116032373;ord={celtraRandom};dc_lat=;dc_rdid=;tag_for_child_directed_treatment=;tfua=?"])};

    if (event.name == 'creativeRendered')
        return {urls: macros([])};

    if (event.name == 'viewable00')
        return {urls: macros([])};

    if (event.name == 'viewable501')
        return {urls: macros([])};

    if (event.name == 'expandRequested')
        return {urls: macros([])};

    if (event.name == 'videoPlayInitiated')
        return {urls: macros([])};

    if (event.name == 'videoStart')
        return {urls: macros([])};

    if (event.name == 'videoFirstQuartile')
        return {urls: macros([])};

    if (event.name == 'videoMidpoint')
        return {urls: macros([])};

    if (event.name == 'videoThirdQuartile')
        return {urls: macros([])};

    if (event.name == 'videoComplete')
        return {urls: macros([])};

    if (event.name == 'videoPause')
        return {urls: macros([])};

    if (event.name == 'videoMuted')
        return {urls: macros([])};

    if (event.name == 'videoUnmuted')
        return {urls: macros([])};

    if (event.name == 'custom')
        return {urls: macros({"ct_background":["https://secure.adnxs.com/px?id=1078246&seg=17067208&t=1"]}[event.label] || [])};

    if (event.name == 'urlOpened')
        return {urls: macros({}[event.label] || [])};

    if (event.name == 'storeOpened')
        return {urls: macros({}[event.label] || [])};
},
// 3rd-party tracker (click regular)
function(event) {
    if (event.name === "firstInteraction")
        return {urls: macros([]), events: [{name: 'click'}] };
},
// Ad server tracker
function(event) {
    if (event.name === "firstInteraction")
        return {urls: macros(["https://ams1-ib.adnxs.com/click?xVBOtKuQ8z9IemLnt0nwPwAAAGCPQiNASHpi57dJ8D_FUE60q5DzP7vt5KvKPMBFkMYR0QJ5Ew7xve9cAAAAADalWgBMBQAAWAQAAAIAAAC-yIsJuXMLAAAAAABVU0QAVVNEACwBWAJM4gAAAAABAQUCAAAAALYAoSeS-AAAAAA./cpcpm=AAAAAAAAAAA=/bcr=AAAAAAAA8D8=/cnd=%21kxTS1wi6sqMOEL6Rr0wYuectIAAoADEAAAAAAAAYQDoJQU1TMTozOTgxQOIMScf0hCUeUOk_Udv5fmq8dLM_WQAAAAAAAAAA/cca=MTExMiNBTVMxOjM5ODE=/bn=83993/clickenc="]), events: [{name: 'clickReportedToSupplier'}] };
}
    ]
})();
    trackers.urlsAndEventsFor = function(event) {
        return this.reduce(function(acc, tracker) {
            var ue = tracker(event) || {};
            return {
                urls:   acc.urls.concat(ue.urls || []),
                events: acc.events.concat(ue.events || [])
            };
        }, {urls: [], events: []});
    };
       

    
var adLoadingEvent = {"name":"adLoading","sessionId":"s1559215636x44404ad788dee3x40227405"};
adLoadingEvent.clientTimestamp = new Date/1000;

trackers.urlsAndEventsFor(adLoadingEvent).urls.forEach(function(url) {
    // On IE 8+ URLs containing '%' character sometimes throw an error and
    // stop current JS run loop. One solution  would be to look for that
    // and replace it with '%25', but we've decided not to modify incoming
    // URLs, because this issue is really a combination of two external
    // problems: broken URL on a buggy browser.
    // https://celtra.atlassian.net/browse/MAB-4476
    try {
        var img = new Image;
        
        img.src = url;
    } catch(e) {}
});
    

    
(function () {
    runtimeParams.protoLoading = {};

    var base64img = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH4wEKCBsN103sxwAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUHAAAAC0lEQVQI12NgAAIAAAUAAeImBZsAAAAASUVORK5CYII=";

    runtimeParams.protoLoading.dataLoadStatus = null;
    // Test if CSP is blocking "data:" source for images
    var dataImg = new Image();
    dataImg.onload = function() {
        runtimeParams.protoLoading.dataLoadStatus = "supported";
    };
    dataImg.onerror = function(e) {
        runtimeParams.protoLoading.dataLoadStatus = "blocked";
    };
    dataImg.src = "data:image/png;base64," + base64img;

    runtimeParams.protoLoading.blobLoadStatus = null;
    // Test if CSP is blocking "blob:" source for images
    var url = null;
    try {
        var binaryImg = atob(base64img);
        var length = binaryImg.length;
        var ab = new ArrayBuffer(length);
        var ua = new Uint8Array(ab);
        for (var i = 0; i < length; i++) {
            ua[i] = binaryImg.charCodeAt(i);
        }
        var blob = new Blob([ab], {type: 'image/png'});
        url = URL.createObjectURL(blob);
    } catch(error) {
        runtimeParams.protoLoading.blobLoadStatus = "error";
        runtimeParams.protoLoading.blobErrorMessage = error.name + ': ' + error.message;
        return;
    }
    var blobImg = new Image();
    blobImg.onload = function() {
        runtimeParams.protoLoading.blobLoadStatus = "supported";
        URL.revokeObjectURL(url);
    };
    blobImg.onerror = function(e) {
        runtimeParams.protoLoading.blobLoadStatus = "blocked";
    };
    blobImg.src = url;
})();
    

    function buildPayloadUrl(payloadBase) {
      var pairs = [];
      for (var k in cacheParams)
          pairs.push(encodeURIComponent(k) + '=' + encodeURIComponent(cacheParams[k]));
      return payloadBase + '?' + pairs.join('&');
    }

    var payloadUrl = buildPayloadUrl(payloadBase);

    
// Request and run payload
var payload = document.createElement('script');
payload.src = payloadUrl;
payload.onload = function() {

runtimeParams.payloadJsClientTimestamp = new Date() / 1000;
window.celtraDeviceInfoRuntimeParams = runtimeParams.deviceInfo;
window.celtra.payloads[payloadUrl](script, runtimeParams, trackers, urlOpenedOverrideUrls, storeOpenedOverrideUrls, macros, urlOpenedUrlAppendage, clickThroughDestinationUrl);
    
};
script.parentNode.insertBefore(payload, script.nextSibling);
    
    
    
})();
  