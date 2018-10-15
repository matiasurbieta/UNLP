// ==UserScript==
// @name       ResponsivePage
// @namespace  http://lifia.unlp.edu.ar
// @author	   Mauricio Witkin, Ramon Serrano
// @version    0.9
// @description  Transform legacy web application to mobile platforms.
// @match      https://*/*
// @match      http://*/*
// @require    https://code.jquery.com/jquery-2.1.4.min.js
// @grant      GM_registerMenuCommand
// @noframes
// @run-at document-end
// ==/UserScript==

(function() {
	'use strict';

	if (window.jQuery){
		$('head script[src*="jquery"]').remove();
	}

	GM_registerMenuCommand('Importar configuración desde catálogo', importJson);
	GM_registerMenuCommand('Eliminar datos almacenados', delLocalSite, "L");

	var siteAdaptation = [];
	var pageUrl = window.location.href;
	var localStoragedError = "El navegador Web no tiene soporte de almacenamiento Local Storage.";

	initialize();

	function initialize() {
		var siteAdaptationStorage = getLocalSite();
		if (siteAdaptationStorage) {
			siteAdaptation = siteAdaptationStorage;
			if($.isArray(siteAdaptation)) {
				var index = indexOfCompareByEquals(siteAdaptation, pageUrl, "url");
				if (index < 0) {
					index = indexOfCompareByIncludes(siteAdaptation, pageUrl, "url");
				}
				if (index > -1) {
					executePageAdaptation(index);
				}
			}
		}
		if (confirm("Desea almacenar las páginas candidatas en el sessionStorage?")) {
			saveCandidates();
		}
		else{
			//alert("No se almacenarán las páginas candidatas.");
		}
		checkStatus();
	}

	 //Función que comprueba en cada click si la conexión es estable y adapta el comportamiento según el caso.
	function checkStatus(){
	 	$("html").on('click', 'a', function(e) {
			if(navigator.onLine){
				//console.log("Hay conexión estable: se acepta el click.");
	  		}
			else{
				e.stopImmediatePropagation(); //Intercepto la acción del click
				e.preventDefault();
				if (confirm("Error de conexión: desea continuar la navegación?")) {
					if(sessionStorage[this.href]){
						//e.preventDefault();
						document.querySelector('html').innerHTML = sessionStorage[this.href]; // Reemplazo el html acutal por el correspondiente a href.
					}
					else{
						//e.preventDefault();
						alert("La página a la que desea acceder no se encuentra almacenada en el sessionStorage.");
					}
				}
				else{
					alert("Permanecerá en la misma página.");
				}
			}
		});
	 	$("html").on('submit', 'form', function(e) {
			if(navigator.onLine){
				//console.log("Hay conexión estable: se genera el submit.");
			}
			else{
				alert("Submit interceptado: No hay conexión a internet.");
				e.preventDefault();
			}
		});
	}
	 //Función que permite almacenar en sessionStorage todas las páginas candidato cacheables, filtrando las que pertenecen al dominio
	//en el que estoy y que no son enlaces internos. Luego, almacena también la página actual.
	function saveCandidates(){
		var aTag = document.getElementsByTagName("a");
		var i, j=0;
	    var substring = "#";
	    var host = location.hostname; // Obtengo el hostname correspondiente al sitio actual.
		var url = [];
		var max = aTag.length; // Determino la cantidad de elementos <a> del sitio (fuera del for para no calcularlo más de una vez).
		for (i=0; i < max; i++){
			url.push(aTag[i].href); // Almaceno el contenido de href de cada una de las <a> de la página actual en url[i].
			// Si la url no es vacía, no se corresponde con un enlace interno (contienen '#') y pertenece el dominio actual (host).
			if ((url[i]!=="") && !(url[i].includes(substring)) && (url[i].includes(host))){
				var $urlAux = url [i];
				j++;
				// AJAX request de tipo GET, que almacena en sessionStorage el html completo de $urlAux.
				$.ajax({
				        'async': false, // Sincrónicamente, de manera que se detenga la navegación hasta almacenar los datos (y que los mismos puedan utilizarse fuera de la request).
				        'type': "GET",
				        'url': $urlAux,
				        'success': function (data) {
				            sessionStorage[$urlAux] = data;
				            console.log(j + ': ' + $urlAux + ' almacenado en sessionStorage.');
				        }
				});
			}
		}
		//Guardo la página actual
		j++;
		sessionStorage[location.href] = document.querySelector('html');
		console.log(j + ' (página actual) : ' + location.href + ' almacenado en sessionStorage.');
		alert('Se almacenaron ' + j + ' páginas en el sessionStorage.')
	}

	function executePageAdaptation(index) {
		var pageStorage = siteAdaptation[index];
		var objectParent = constructObject(pageStorage.pageAdaptation);
		runPage(objectParent,$("body"),$("head"), pageStorage.template);
	}

	function importJson() {
		var myUrl = window.location.href;
		var getReqCatalog = new XMLHttpRequest();
		var urlCatalog = "http://localhost:3000/api/augmentations/?url=" + myUrl;
		getReqCatalog.open("GET", urlCatalog, false);
		getReqCatalog.setRequestHeader("Content-Type", "application/json");
		getReqCatalog.send();
		if (getReqCatalog.status == 200 || getReqCatalog.status == 400){
			var xhrResponse = getReqCatalog.responseText;
		}
		/* La longitud debe tener un minimo de datos para asegurar la estructura inicial del Json. */
		var siteImport = JSON.parse(xhrResponse);
        if (siteImport.includes("No hay transformaciones") || siteImport.includes("URL necesaria")){
            //alert("Respuesta del catálogo: " + siteImport);
        } else{
            if (/\d/.test(siteImport)){
            siteImport+= '';
			var options = siteImport.split(","); // o siteImport
		    getReqCatalog = new XMLHttpRequest();
		    urlCatalog = "http://localhost:3000/api/augmentations/" + options[options.length - 1];
		    getReqCatalog.open("GET", urlCatalog, false);
		    getReqCatalog.setRequestHeader("Content-Type", "application/json");
		    getReqCatalog.send();
			if (getReqCatalog.status == 200 || getReqCatalog.status == 400){
				xhrResponse = getReqCatalog.responseText;
			}
		}
        siteImport = JSON.parse(xhrResponse);
        if(Array.isArray(siteImport)) {
            saveLocalSite(siteImport);
            siteAdaptation = siteImport;
            var index = indexOfCompareByEquals(siteAdaptation, pageUrl, "url");
            if (index < 0) {
                index = indexOfCompareByIncludes(siteAdaptation, pageUrl, "url");
            }
            if (index > -1) {
                executePageAdaptation(index);
            }
            alert("Se ha importado correctamente la configuración.");
        }
        else {
            alert("Los datos ingresados no tienen un formato válido.");
        }
        }
	}

	function saveLocalSite(site){
		if (typeof(Storage) !== "undefined") {
			localStorage.setItem("siteAdaptation", JSON.stringify(site));
		}
		else {
			alert(localStoragedError);
		}
	}

	function getLocalSite(){
		if (typeof(Storage) !== "undefined") {
			return JSON.parse(localStorage.getItem("siteAdaptation"));
		} else {
			alert(localStoragedError);
		}
	}

	function getElements(xpath){
		/* Recive algo como obj[0].headerLeft */
		var node = document.evaluate(
				xpath,
				document,
				null,
				XPathResult.FIRST_ORDERED_NODE_TYPE,
				null ).singleNodeValue;
		return node;
	}

	function concatElement(element){
		var stringElements = "";
		var getElement;
		$.each( element, function( key, value ) {
			if (value != "none"){
				getElement = getElements(value);
				if(getElement != null){
					stringElements += "<div>"+getElement.innerHTML+"</div>";
				}
				else
					stringElements = null;
			}
			else
				stringElements = "none";
		});
		return stringElements;
	}

	function constructObject(obj){
		var object = {};
		var error = false;
		var message = null;
		$.each( obj, function( key, value ) {
			var elem = concatElement(value["xpath"]);
			if (elem == null){
				error = true;
				message = "No se pudo cargar un elemento en "+key;
				return true;
			}
			if (elem == "none"){
				object[key] = {"xpath":"","pattern":"none"};
			}
			else
				object[key] = {"xpath":elem,"pattern":value["pattern"]};
		});
		if (error == true){
			alert(message);
			return null;
		}
		else
			return object;
	}

	function runPage(objectParent, iBody, iHead, pageTemplate){
		if (objectParent !== null){
			iBody.html("");
            if (!("material" === pageTemplate)){
                iHead.append("<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">");
                iHead.append("<script src='https://code.jquery.com/jquery-2.1.4.min.js'></script>");
                iHead.append("<script src='https://maxcdn.bootstrapcdn.com/bootstrap/3.3.4/js/bootstrap.min.js'></script>");
                iHead.append("<link rel='stylesheet' href='https://maxcdn.bootstrapcdn.com/bootstrap/3.3.4/css/bootstrap-theme.min.css'>");
                iHead.append("<link rel='stylesheet' href='https://maxcdn.bootstrapcdn.com/bootstrap/3.3.4/css/bootstrap.min.css'>");
                iHead.append("<style>*{min-width: 0px !important;}</style>");
                iHead.append("<style>.heighBand20{height:20%;}</style>");
                iHead.append("<style>.height15{height:15%;}</style>");
                iHead.append("<style>.height20{height:20%;}</style>");
                iHead.append("<style>.height25{height:25%;}</style>");
                iHead.append("<style>.height40{height:40%;}</style>");
                iHead.append("<style>.height55{height:55%;}</style>");
                iHead.append("<style>.heighBand33{height:33%;}</style>");
                iHead.append("<style>.widthBand50{width:50%;}</style>");
                iHead.append("<style>.dashedBottom{border-bottom-style:dashed;}</style>");
                iHead.append("<style>.dashedRight{border-right-style:dashed;}</style>");
            }
			if ("generic" === pageTemplate){
				iBody.append("<div class='container-fluid'> " +
					"<div class='row'> <div id='header-0' class='col-xs-4 height20 dashedBottom dashedRight widthBand33'> </div> <div id='header-1' class='col-xs-4 height20 dashedBottom dashedRight widthBand33'> </div> <div id='header-2' class='col-xs-4 height20 dashedBottom widthBand33'> </div> </div> " +
					"<div class='row'> <div id='navigation-0' class='col-xs-12 height20 dashedBottom'> </div> </div> " +
					"<div class='row'> <div id='main-0' class='col-xs-4 height40 dashedBottom dashedRight widthBand33'> </div> <div id='main-1' class='col-xs-4 height40 dashedBottom dashedRight widthBand33'> </div> <div id='main-2' class='col-xs-4 height40 dashedBottom widthBand33'> </div> </div> " +
					"<div class='row'> <div id='footer-0' class='col-xs-4 height20 dashedRight widthBand33'> </div> <div id='footer-1' class='col-xs-4 height20 dashedRight widthBand33'> </div> <div id='footer-2' class='col-xs-4 height20 widthBand33'> </div> </div> </div>");
				importElement(objectParent["header-0"],"#header-0",iBody);
				importElement(objectParent["header-1"],"#header-1",iBody);
				importElement(objectParent["header-2"],"#header-2",iBody);
				importElement(objectParent["navigation-0"],"#navigation-0",iBody);
				importElement(objectParent["main-0"],"#main-0",iBody);
				importElement(objectParent["main-1"],"#main-1",iBody);
				importElement(objectParent["main-2"],"#main-2",iBody);
				importElement(objectParent["footer-0"],"#footer-0",iBody);
				importElement(objectParent["footer-1"],"#footer-1",iBody);
				importElement(objectParent["footer-2"],"#footer-2",iBody);
			}
			else if ("mobilePhone" === pageTemplate) {
				iBody.append("<div class='container-fluid'> " +
					"<div class='row'> <div id='header-0' class='col-xs-12 height15 dashedBottom'></div> </div> " +
                    "<div class='row'> <div id='navigation-0' class='col-xs-12 height15 dashedBottom'></div> </div> " +
					"<div class='row'> <div id='main-0' class='col-xs-12 height55 dashedBottom'></div> </div> " +
					"<div class='row'> <div id='footer-0' class='col-xs-12 height15'></div> </div> </div>");
				importElement(objectParent["header-0"],"#header-0",iBody);
                importElement(objectParent["navigation-0"],"#navigation-0",iBody);
				importElement(objectParent["main-0"],"#main-0",iBody);
				importElement(objectParent["footer-0"],"#footer-0",iBody);
			}
			else if ("tablet" === pageTemplate) {
				iBody.append("<div class='container-fluid'> " +
					"<div class='row'> <div id='header-0' class='col-xs-12 height20 dashedBottom'> </div> </div> " +
					"<div class='row'> <div id='navigation-0' class='col-xs-12 height20 dashedBottom'> </div> </div> " +
					"<div class='row'> <div id='main-0' class='col-xs-6 height40 dashedBottom dashedRight widthBand50'> </div> <div id='main-1' class='col-xs-6 height40 dashedBottom widthBand50'> </div> </div> " +
					"<div class='row'> <div id='footer-0' class='col-xs-12 height20'> </div> </div> </div>");
				importElement(objectParent["header-0"],"#header-0",iBody);
                importElement(objectParent["navigation-0"],"#navigation-0",iBody);
				importElement(objectParent["main-0"],"#main-0",iBody);
				importElement(objectParent["main-1"],"#main-1",iBody);
				importElement(objectParent["footer-0"],"#footer-0",iBody);
			}
			else if ("material" === pageTemplate) {
				iHead.append("<meta name='viewport' content='width=device-width, initial-scale=1.0, minimum-scale=1.0'>");
			    iHead.append("<link rel='stylesheet' href='https://fonts.googleapis.com/css?family=Roboto:regular,bold,italic,thin,light,bolditalic,black,medium&amp;lang=en'>");
			    iHead.append("<link rel='stylesheet' href='https://fonts.googleapis.com/icon?family=Material+Icons'>");
			    iHead.append("<link rel='stylesheet' href='https://code.getmdl.io/1.3.0/material.min.css'>");
				iHead.append("<style> body {margin: 0; }</style>");
				iHead.append("<style> a img{border: 0px; }</style>");
				iHead.append("<style> ::-moz-selection {background-color: #6ab344; color: #fff; }</style>");
				iHead.append("<style> ::selection {background-color: #6ab344; color: #fff; }</style>");
				iHead.append("<style> .main-content {padding-top: 64px; padding-left: 20px;}</style>");
				iHead.append("<style> .android-header .mdl-menu__container {z-index: 50; margin: 0 !important; }</style>");
				iHead.append("<style> .android-mobile-title {display: none !important; }</style>");
				iHead.append("<style> .android-header {overflow: visible; background-color: white; position: fixed;}</style>");
				iHead.append("<style> .android-header .material-icons {color: #767777 !important; }</style>");
				iHead.append("<style> .android-header .mdl-layout__drawer-button {background: transparent; color: #767777; }</style>");
				iHead.append("<style> .android-header .mdl-navigation__link {color: #757575; font-weight: 700; font-size: 14px; padding-left: 10px; padding-right: 10px}</style>");
				iHead.append("<style> .android-navigation-container {direction: rtl; -webkit-order: 1; -ms-flex-order: 1; order: 1; width: 500px; transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1), width 0.2s cubic-bezier(0.4, 0, 0.2, 1); }</style>");
				iHead.append("<style> .android-navigation {direction: ltr; -webkit-justify-content: flex-end; -ms-flex-pack: end; justify-content: flex-end; width: 800px; }</style>");
				iHead.append("<style> .android-navigation .mdl-navigation__link {display: inline-block; height: 60px; line-height: 68px; background-color: transparent !important; border-bottom: 4px solid transparent; }</style>");
				iHead.append("<style> .android-navigation .mdl-navigation__link:hover {border-bottom: 4px solid #8bc34a; }</style>");
				iHead.append("<style> .android-more-button {-webkit-order: 3; -ms-flex-order: 3; order: 3; }</style>");
				iHead.append("<style> .android-drawer {border-right: none; position: fixed;}</style>");
				iHead.append("<style> .android-drawer-separator {height: 1px; background-color: #dcdcdc; margin: 8px 0; }</style>");
				iHead.append("<style> .android-drawer .mdl-navigation__link.mdl-navigation__link {font-size: 14px; color: #757575; }</style>");
				iHead.append("<style> .android-drawer span.mdl-navigation__link.mdl-navigation__link {color: #8bc34a; }</style>");
				iHead.append("<style> .android-drawer .mdl-layout-title {position: relative; background: #6ab344; color: #fff; display: table-cell; }</style>");
				iHead.append("<style> .android-link {text-decoration: none; color: #8bc34a !important; }</style>");
				iHead.append("<style> .android-link:hover {color: #7cb342 !important; }</style>");
				iHead.append("<style> .android-link .material-icons {position: relative; top: -1px; vertical-align: middle; }</style>");
				iHead.append("<style> .android-alt-link {text-decoration: none; color: #64ffda !important; font-size: 16px; }</style>");
				iHead.append("<style> .android-alt-link:hover {color: #00bfa5 !important; }</style>");
				iHead.append("<style> .android-alt-link .material-icons {position: relative; top: 6px; }</style>");
				iHead.append("<style> .android-footer {background-color: #fafafa; position: relative; }</style>");
				iHead.append("<style> .android-footer a:hover {color: #8bc34a; }</style>");
				iHead.append("<style> .android-footer .mdl-mega-footer--top-section::after {border-bottom: none; }</style>");
				iHead.append("<style> .android-footer .mdl-mega-footer--middle-section::after {border-bottom: none; }</style>");
				iHead.append("<style> .android-footer .mdl-mega-footer--bottom-section {position: relative; }</style>");
				iHead.append("<style> .android-footer .mdl-mega-footer--bottom-section a {margin-right: 2em; }</style>");
				iHead.append("<style> .android-footer .mdl-mega-footer--right-section a .material-icons {position: relative; top: 6px; }</style>");
				iHead.append("<style> .android-link-menu:hover {cursor: pointer; }</style>");
				iHead.append("<style> @media (max-width: 700px) {"+
				  ".android-navigation-container {display: none; }"+
				  ".android-title {display: none !important; }"+
				  ".android-mobile-title {display: block !important; position: absolute; left: calc(50% - 70px); top: 12px; transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1); }"+
				  ".android-more-button {display: none; }"+
				  ".android-footer .mdl-mega-footer--bottom-section {display: none; }"+
				"}</style>");
				iHead.append("<style> #view-source {position: fixed; display: block; right: 0; bottom: 0; margin-right: 40px; margin-bottom: 40px; z-index: 900; } </style>");
				iBody.append("<div class='mdl-layout mdl-js-layout mdl-layout--fixed-header'><div class='android-header mdl-layout__header mdl-layout__header--waterfall is-casting-shadow is-compact'>"+
                "<div aria-expanded='false' role='button' tabindex='0' class='mdl-layout__drawer-button' id='drwrbtn'><i class='material-icons'></i></div> <div class='mdl-layout__header-row'>"+
				"<span class='android-title mdl-layout-title'><div id='header-0' style='color: #8bc34a;'></div></span><div class='android-header-spacer mdl-layout-spacer'></div>"+
				"<div class='android-navigation-container'><nav class='android-navigation mdl-navigation' id='navigation-0'></nav></div>"+
				"<span class='android-mobile-title mdl-layout-title'><div id='header-1'></div></span></div></div>"+
				"<div id='drwr' class='android-drawer mdl-layout__drawer' aria-hidden='true'><span class='mdl-layout-title'><div id='header-2'></div></span><nav class='mdl-navigation' id='navigation-1'></nav></div>"+
				"<div class='android-content mdl-layout__content'><a name='top'></a><div class='main-content' id='main-0'></div><footer class='android-footer mdl-mega-footer'>"+
				"<div class='mdl-mega-footer--top-section'><div class='mdl-mega-footer--right-section'><a class='mdl-typography--font-light' href='#top'>Volver Arriba<i class='material-icons'>expand_less</i></a></div></div>"+
				"<div class='mdl-mega-footer--middle-section mdl-typography--font-light' id='footer-0'></div>"+
				"<div class='mdl-mega-footer--bottom-section' id='navigation-2'></div></footer></div>"+
                "<div class='mdl-layout__obfuscator' id='bfsctr'></div></div>"+
				"<a href='' target='_blank' id='view-source' class='mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect mdl-color--accent mdl-color-text--accent-contrast'>Ver Original</a>");
				importElement(objectParent["header-0"],"#header-0",iBody);
				importElement(objectParent["header-0"],"#header-1",iBody);
				importElement(objectParent["header-0"],"#header-2",iBody);
                importElement(objectParent["navigation-0"],"#navigation-0",iBody);
                importElement(objectParent["navigation-0"],"#navigation-1",iBody);
                importElement(objectParent["navigation-0"],"#navigation-2",iBody);
				importElement(objectParent["main-0"],"#main-0",iBody);
				importElement(objectParent["footer-0"],"#footer-0",iBody);
				iBody.append("<script type='text/javascript'>"+
				"var drawerButton = document.getElementById('drwrbtn');"+
				"var drawer = document.getElementById('drwr');"+
				"var obfuscator = document.getElementById('bfsctr');"+
				"if ( drawerButton != null && drawer != null && obfuscator != null ) {"+
				"drawerButton.onclick = function (evt) {"+
				"if (evt && evt.type === 'keydown') {if (evt.keyCode === this.Keycodes_.SPACE || evt.keyCode === this.Keycodes_.ENTER) {evt.preventDefault(); } else {return; } } toggleDrawer(); };"+
				"toggleDrawer = function () {"+
				"if (drawer.getAttribute('aria-hidden') == 'true') {obfuscator.className = 'mdl-layout__obfuscator is-visible'; drawer.className = 'android-drawer mdl-layout__drawer is-visible'; drawer.setAttribute('aria-hidden', 'false'); drawerButton.setAttribute('aria-expanded', 'true');"+
				"} else {obfuscator.className = 'mdl-layout__obfuscator'; drawer.className = 'android-drawer mdl-layout__drawer'; drawer.setAttribute('aria-hidden', 'true'); drawerButton.setAttribute('aria-expanded', 'false'); } };"+
				"obfuscator.onclick = function (evt) {"+
				"if (evt && evt.type === 'keydown') {if (evt.keyCode === this.Keycodes_.SPACE || evt.keyCode === this.Keycodes_.ENTER) {evt.preventDefault(); } else {return; } } toggleDrawer(); }; "+
				"};"+
				"</script>");
			}
			else {
				//alert("Información del template incompleta.");
			}
		}
	}
	// Funcion para aplicar un patron en el iframe de previsualizacion
	function importElement(source, destination, iBody){
		var divElement = iBody.find(destination);
		if ("pattern0" === source.pattern ) {
			//divElement.removeClass("heighBand20");
			divElement.append(source.xpath);
		}
		else if ("pattern1" === source.pattern ) {
			// Menu
			applyPattern1(source.xpath, divElement, iBody);
		}
		else if ("pattern2" === source.pattern ) {
			// Títulos
			divElement.css({'font-size':'200%', 'font-weight':'bold'});
			divElement.append(source.xpath);
		}
		else if ("pattern3" === source.pattern ) {
			// Formulario
			applyPattern3(divElement, source.xpath);
		}
		else if ("pattern4" === source.pattern ) {
			// Menú material
			applyPattern4(source.xpath, divElement, iBody);
		}
	}

	// Funcion para aplicar el patron menu material
	function applyPattern4(xpath, divElement, iBody){
		if (xpath) {
			var dwrap = document.createElement("div");
			$(dwrap).html(xpath);
			var links = $(dwrap).find("a");
			$.each($(links), function(i, e){
				if (divElement[0].className == "mdl-mega-footer--bottom-section"){
					e.className += " android-link mdl-typography--font-light";
				} else if (divElement[0].className == "android-navigation mdl-navigation"){
					e.className += " mdl-navigation__link mdl-typography--text-uppercase";
				} else if (divElement[0].className == "mdl-navigation"){
					e.className += " mdl-navigation__link";
				}
				divElement.append($(e));
			});
		}
	}


	function applyPattern3(divElement, html){
		var css = "<style class='patterCss3'>" +
		"@media screen and (max-width:721px) { " +
		"form > div { margin: 0 0 15px 0; } " +
		"form > div > label, " +
		"legend { " +
		"width: 100%; " +
		"float: none; " +
		"margin: 0 0 5px 0;" +
		"} " +
		"form > div > div, " +
		"form > div > fieldset > div { " +
		"width: 100%; " +
		"float: none;" +
		"} " +
		"input[type=text], " +
		"input[type=email], " +
		"input[type=url], " +
		"input[type=password], " +
		"textarea, " +
		"select { " +
		"width: 100%;" +
		"} " +
		"}" +
		"</style>";
		divElement.append(css);
		divElement.append(html);
	}

	function applyPattern1(xpath, divElement, iBody){
		if (xpath) {
			var dwrap = document.createElement("div");
			$(dwrap).html(xpath);
			var links = $(dwrap).find("a");
			divElement.append("<nav class='navbar navbar-default' role='navigation'> <div class='navbar-header'> " +
					"<button type='button' class='navbar-toggle' data-toggle='collapse' data-target='#bs-example-navbar-collapse-1'> " +
					"<span class='sr-only'>Toggle navigation</span><span class='icon-bar'></span><span class='icon-bar'></span><span class='icon-bar'></span></button> </div>  " +
					"<div class='collapse navbar-collapse' id='bs-example-navbar-collapse-1'> <ul id='menu-nav' class='nav navbar-nav'>  </ul> </div>  </nav> ");
			$.each($(links), function(i, e){
				var newLinks = document.createElement("li");
				$(newLinks).append($(e));
				iBody.find("#menu-nav").append($(newLinks));
			});
		}
	}

	function indexOfCompareByIncludes(myArray, searchTerm, property) {
		if (!myArray) {
			return -1;
		}
		var searchUrl = normalizeUrl(searchTerm);
		for(var i = 0, len = myArray.length; i < len; i++) {
			if (myArray[i]["urlCompareType"] == "contain" && searchUrl.includes(normalizeUrl(myArray[i][property])))
				return i;
		}
		return -1;
	}

	function indexOfCompareByEquals(myArray, searchTerm, property) {
		if (!myArray) {
			return -1;
		}
		var searchUrl = normalizeUrl(searchTerm);
		for(var i = 0, len = myArray.length; i < len; i++) {
			if (myArray[i]["urlCompareType"] == "equal" && normalizeUrl(myArray[i][property]) === searchUrl)
				return i;
		}
		return -1;
	}

	function delLocalSite(){
		if (typeof(Storage) !== "undefined") {
			localStorage.removeItem("siteAdaptation");
			siteAdaptation = [];
            location.reload();
		}
		else {
			alert(localStoragedError);
		}
	}

	function normalizeUrl(url) {
		var normalize = url.replace("http://","");
		normalize = normalize.replace("https://","");
		return normalize;
	}

})();