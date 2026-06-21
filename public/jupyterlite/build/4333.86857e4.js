"use strict";(self.webpackChunk_JUPYTERLAB_CORE_OUTPUT=self.webpackChunk_JUPYTERLAB_CORE_OUTPUT||[]).push([[4333],{24333:(e,t,o)=>{function r(e,t,o){return isNaN(e)||e<=t?t:e>=o?o:e}function a(e,t,o){return isNaN(e)||e<=t?0:e>=o?1:e/(o-t)}function i(e,t,o){return isNaN(e)?t:t+e*(o-t)}function l(e){return e*(Math.PI/180)}function n(e,t,o){return isNaN(e)||e<=0?t:e>=1?o:t+e*(o-t)}function s(e,t,o){if(e<=0)return t%360;if(e>=1)return o%360;const r=(t-o+360)%360;return r<=(o-t+360)%360?(t-r*e+360)%360:(t+r*e+360)%360}function c(e,t){const o=Math.pow(10,t);return Math.round(e*o)/o}o.r(t),o.d(t,{Accordion:()=>Dr,AccordionItem:()=>Vr,Anchor:()=>Ar,AnchoredRegion:()=>Er,Avatar:()=>Xr,Badge:()=>Kr,Breadcrumb:()=>ta,BreadcrumbItem:()=>aa,Button:()=>na,Card:()=>ha,Checkbox:()=>ba,Combobox:()=>xa,DataGrid:()=>Ta,DataGridCell:()=>Ca,DataGridRow:()=>Sa,DateField:()=>Oa,DelegatesARIAToolbar:()=>xl,DesignSystemProvider:()=>_a,Dialog:()=>Ya,DirectionalStyleSheetBehavior:()=>qr,Disclosure:()=>Ka,Divider:()=>ti,FoundationToolbar:()=>$l,Listbox:()=>ri,Menu:()=>li,MenuItem:()=>ci,NumberField:()=>ui,Option:()=>bi,PaletteRGB:()=>ae,Picker:()=>Ml,PickerList:()=>Ul,PickerListItem:()=>Yl,PickerMenu:()=>El,PickerMenuOption:()=>ql,Progress:()=>vi,ProgressRing:()=>yi,Radio:()=>Ci,RadioGroup:()=>Di,Search:()=>Li,Select:()=>Hi,Skeleton:()=>Pi,Slider:()=>Ei,SliderLabel:()=>Yi,StandardLuminance:()=>A,SwatchRGB:()=>R,Switch:()=>Ki,Tab:()=>al,TabPanel:()=>tl,Tabs:()=>nl,TextArea:()=>dl,TextField:()=>pl,Toolbar:()=>yl,Tooltip:()=>Fl,TreeItem:()=>jl,TreeView:()=>Hl,accentColor:()=>wt,accentFillActive:()=>Mt,accentFillActiveDelta:()=>We,accentFillFocus:()=>Gt,accentFillFocusDelta:()=>Ue,accentFillHover:()=>At,accentFillHoverDelta:()=>qe,accentFillRecipe:()=>Pt,accentFillRest:()=>It,accentFillRestDelta:()=>_e,accentForegroundActive:()=>ro,accentForegroundActiveDelta:()=>Ze,accentForegroundFocus:()=>ao,accentForegroundFocusDelta:()=>Je,accentForegroundHover:()=>oo,accentForegroundHoverDelta:()=>Ye,accentForegroundRecipe:()=>eo,accentForegroundRest:()=>to,accentForegroundRestDelta:()=>Xe,accentPalette:()=>kt,accordionItemStyles:()=>Cr,accordionStyles:()=>wr,addJupyterLabThemeChangeListener:()=>mr,allComponents:()=>Jl,anchorStyles:()=>Ir,anchoredRegionStyles:()=>Gr,applyJupyterTheme:()=>xr,avatarStyles:()=>Ur,badgeStyles:()=>Jr,baseHeightMultiplier:()=>be,baseHorizontalSpacingMultiplier:()=>fe,baseLayerLuminance:()=>me,bodyFont:()=>ge,breadcrumbItemStyles:()=>ra,breadcrumbStyles:()=>ea,buttonStyles:()=>la,cardStyles:()=>da,checkboxStyles:()=>pa,checkboxTemplate:()=>ga,comboboxStyles:()=>$a,controlCornerRadius:()=>ve,dataGridCellStyles:()=>Fa,dataGridRowStyles:()=>ka,dataGridStyles:()=>wa,dateFieldStyles:()=>Pa,dateFieldTemplate:()=>Ia,density:()=>$e,designSystemProviderStyles:()=>Wa,designSystemProviderTemplate:()=>qa,designUnit:()=>xe,dialogStyles:()=>Xa,direction:()=>we,disabledOpacity:()=>ke,disclosureStyles:()=>Ja,dividerStyles:()=>ei,elementScale:()=>ye,errorColor:()=>_o,errorFillActive:()=>Yo,errorFillFocus:()=>Zo,errorFillHover:()=>Xo,errorFillRecipe:()=>Wo,errorFillRest:()=>Uo,errorForegroundActive:()=>hr,errorForegroundFocus:()=>ur,errorForegroundHover:()=>dr,errorForegroundRecipe:()=>sr,errorForegroundRest:()=>cr,errorPalette:()=>qo,fillColor:()=>Ot,focusStrokeInner:()=>Bo,focusStrokeInnerRecipe:()=>zo,focusStrokeOuter:()=>To,focusStrokeOuterRecipe:()=>Do,focusStrokeWidth:()=>Ce,foregroundOnAccentActive:()=>Ut,foregroundOnAccentActiveLarge:()=>Kt,foregroundOnAccentFocus:()=>Xt,foregroundOnAccentFocusLarge:()=>Qt,foregroundOnAccentHover:()=>Wt,foregroundOnAccentHoverLarge:()=>Jt,foregroundOnAccentLargeRecipe:()=>Yt,foregroundOnAccentRecipe:()=>_t,foregroundOnAccentRest:()=>qt,foregroundOnAccentRestLarge:()=>Zt,foregroundOnErrorActive:()=>tr,foregroundOnErrorActiveLarge:()=>lr,foregroundOnErrorFocus:()=>or,foregroundOnErrorFocusLarge:()=>nr,foregroundOnErrorHover:()=>er,foregroundOnErrorHoverLarge:()=>ir,foregroundOnErrorLargeRecipe:()=>rr,foregroundOnErrorRecipe:()=>Ko,foregroundOnErrorRest:()=>Qo,foregroundOnErrorRestLarge:()=>ar,heightNumberAsToken:()=>Eo,horizontalSliderLabelStyles:()=>Wi,imgTemplate:()=>Yr,isDark:()=>G,jpAccordion:()=>Tr,jpAccordionItem:()=>Sr,jpAnchor:()=>Mr,jpAnchoredRegion:()=>_r,jpAvatar:()=>Zr,jpBadge:()=>Qr,jpBreadcrumb:()=>oa,jpBreadcrumbItem:()=>ia,jpButton:()=>sa,jpCard:()=>ua,jpCheckbox:()=>fa,jpCombobox:()=>ya,jpDataGrid:()=>za,jpDataGridCell:()=>Va,jpDataGridRow:()=>Da,jpDateField:()=>Aa,jpDesignSystemProvider:()=>Ua,jpDialog:()=>Za,jpDisclosure:()=>Qa,jpDivider:()=>oi,jpListbox:()=>ai,jpMenu:()=>ni,jpMenuItem:()=>di,jpNumberField:()=>pi,jpOption:()=>fi,jpPicker:()=>Gl,jpPickerList:()=>Xl,jpPickerListItem:()=>Zl,jpPickerMenu:()=>_l,jpPickerMenuOption:()=>Wl,jpProgress:()=>$i,jpProgressRing:()=>wi,jpRadio:()=>Vi,jpRadioGroup:()=>Ti,jpSearch:()=>Ni,jpSelect:()=>Oi,jpSkeleton:()=>Ii,jpSlider:()=>_i,jpSliderLabel:()=>Zi,jpSwitch:()=>Qi,jpTab:()=>il,jpTabPanel:()=>ol,jpTabs:()=>sl,jpTextArea:()=>hl,jpTextField:()=>gl,jpToolbar:()=>wl,jpTooltip:()=>Cl,jpTreeItem:()=>Ll,jpTreeView:()=>Ol,listboxStyles:()=>ma,menuItemStyles:()=>si,menuStyles:()=>ii,neutralColor:()=>xt,neutralFillActive:()=>so,neutralFillActiveDelta:()=>et,neutralFillFocus:()=>co,neutralFillFocusDelta:()=>tt,neutralFillHover:()=>no,neutralFillHoverDelta:()=>Qe,neutralFillInputActive:()=>go,neutralFillInputActiveDelta:()=>at,neutralFillInputFocus:()=>bo,neutralFillInputFocusDelta:()=>it,neutralFillInputHover:()=>po,neutralFillInputHoverDelta:()=>rt,neutralFillInputRecipe:()=>ho,neutralFillInputRest:()=>uo,neutralFillInputRestDelta:()=>ot,neutralFillLayerRecipe:()=>Vo,neutralFillLayerRest:()=>So,neutralFillLayerRestDelta:()=>gt,neutralFillRecipe:()=>io,neutralFillRest:()=>lo,neutralFillRestDelta:()=>Ke,neutralFillStealthActive:()=>$o,neutralFillStealthActiveDelta:()=>st,neutralFillStealthFocus:()=>xo,neutralFillStealthFocusDelta:()=>ct,neutralFillStealthHover:()=>vo,neutralFillStealthHoverDelta:()=>nt,neutralFillStealthRecipe:()=>fo,neutralFillStealthRest:()=>mo,neutralFillStealthRestDelta:()=>lt,neutralFillStrongActive:()=>Fo,neutralFillStrongActiveDelta:()=>ut,neutralFillStrongFocus:()=>Co,neutralFillStrongFocusDelta:()=>pt,neutralFillStrongHover:()=>ko,neutralFillStrongHoverDelta:()=>ht,neutralFillStrongRecipe:()=>yo,neutralFillStrongRest:()=>wo,neutralFillStrongRestDelta:()=>dt,neutralForegroundHint:()=>Lo,neutralForegroundHintRecipe:()=>jo,neutralForegroundRecipe:()=>No,neutralForegroundRest:()=>Ho,neutralLayer1:()=>Tt,neutralLayer1Recipe:()=>Dt,neutralLayer2:()=>Bt,neutralLayer2Recipe:()=>zt,neutralLayer3:()=>Lt,neutralLayer3Recipe:()=>jt,neutralLayer4:()=>Ht,neutralLayer4Recipe:()=>Nt,neutralLayerCardContainer:()=>Ct,neutralLayerCardContainerRecipe:()=>Ft,neutralLayerFloating:()=>St,neutralLayerFloatingRecipe:()=>Vt,neutralPalette:()=>yt,neutralStrokeActive:()=>Io,neutralStrokeActiveDelta:()=>mt,neutralStrokeDividerRecipe:()=>Mo,neutralStrokeDividerRest:()=>Go,neutralStrokeDividerRestDelta:()=>$t,neutralStrokeFocus:()=>Ao,neutralStrokeFocusDelta:()=>vt,neutralStrokeHover:()=>Po,neutralStrokeHoverDelta:()=>ft,neutralStrokeRecipe:()=>Oo,neutralStrokeRest:()=>Ro,neutralStrokeRestDelta:()=>bt,numberFieldStyles:()=>hi,optionStyles:()=>gi,pickerListItemStyles:()=>Al,pickerMenuOptionStyles:()=>Il,pickerMenuStyles:()=>Pl,pickerStyles:()=>Rl,progressRingStyles:()=>xi,progressStyles:()=>mi,provideJupyterDesignSystem:()=>Kl,radioGroupStyles:()=>Si,radioStyles:()=>ki,radioTemplate:()=>Fi,searchStyles:()=>ji,selectStyles:()=>va,skeletonStyles:()=>Ri,sliderLabelStyles:()=>Xi,sliderStyles:()=>Gi,strokeWidth:()=>Fe,switchStyles:()=>Ji,tabPanelStyles:()=>el,tabStyles:()=>rl,tabsStyles:()=>ll,textAreaStyles:()=>cl,textFieldStyles:()=>ul,toolbarStyles:()=>ml,tooltipStyles:()=>kl,treeItemStyles:()=>Bl,treeViewStyles:()=>Nl,typeRampBaseFontSize:()=>Ve,typeRampBaseLineHeight:()=>Se,typeRampMinus1FontSize:()=>De,typeRampMinus1LineHeight:()=>Te,typeRampMinus2FontSize:()=>ze,typeRampMinus2LineHeight:()=>Be,typeRampPlus1FontSize:()=>je,typeRampPlus1LineHeight:()=>Le,typeRampPlus2FontSize:()=>Ne,typeRampPlus2LineHeight:()=>He,typeRampPlus3FontSize:()=>Oe,typeRampPlus3LineHeight:()=>Re,typeRampPlus4FontSize:()=>Pe,typeRampPlus4LineHeight:()=>Ie,typeRampPlus5FontSize:()=>Ae,typeRampPlus5LineHeight:()=>Me,typeRampPlus6FontSize:()=>Ge,typeRampPlus6LineHeight:()=>Ee,verticalSliderLabelStyles:()=>Ui}),Math.PI;class d{constructor(e,t,o,r){this.r=e,this.g=t,this.b=o,this.a="number"!=typeof r||isNaN(r)?1:r}static fromObject(e){return!e||isNaN(e.r)||isNaN(e.g)||isNaN(e.b)?null:new d(e.r,e.g,e.b,e.a)}equalValue(e){return this.r===e.r&&this.g===e.g&&this.b===e.b&&this.a===e.a}toStringHexRGB(){return"#"+[this.r,this.g,this.b].map(this.formatHexValue).join("")}toStringHexRGBA(){return this.toStringHexRGB()+this.formatHexValue(this.a)}toStringHexARGB(){return"#"+[this.a,this.r,this.g,this.b].map(this.formatHexValue).join("")}toStringWebRGB(){return`rgb(${Math.round(i(this.r,0,255))},${Math.round(i(this.g,0,255))},${Math.round(i(this.b,0,255))})`}toStringWebRGBA(){return`rgba(${Math.round(i(this.r,0,255))},${Math.round(i(this.g,0,255))},${Math.round(i(this.b,0,255))},${r(this.a,0,1)})`}roundToPrecision(e){return new d(c(this.r,e),c(this.g,e),c(this.b,e),c(this.a,e))}clamp(){return new d(r(this.r,0,1),r(this.g,0,1),r(this.b,0,1),r(this.a,0,1))}toObject(){return{r:this.r,g:this.g,b:this.b,a:this.a}}formatHexValue(e){return function(e){const t=Math.round(r(e,0,255)).toString(16);return 1===t.length?"0"+t:t}(i(e,0,255))}}const h={aliceblue:{r:.941176,g:.972549,b:1},antiquewhite:{r:.980392,g:.921569,b:.843137},aqua:{r:0,g:1,b:1},aquamarine:{r:.498039,g:1,b:.831373},azure:{r:.941176,g:1,b:1},beige:{r:.960784,g:.960784,b:.862745},bisque:{r:1,g:.894118,b:.768627},black:{r:0,g:0,b:0},blanchedalmond:{r:1,g:.921569,b:.803922},blue:{r:0,g:0,b:1},blueviolet:{r:.541176,g:.168627,b:.886275},brown:{r:.647059,g:.164706,b:.164706},burlywood:{r:.870588,g:.721569,b:.529412},cadetblue:{r:.372549,g:.619608,b:.627451},chartreuse:{r:.498039,g:1,b:0},chocolate:{r:.823529,g:.411765,b:.117647},coral:{r:1,g:.498039,b:.313725},cornflowerblue:{r:.392157,g:.584314,b:.929412},cornsilk:{r:1,g:.972549,b:.862745},crimson:{r:.862745,g:.078431,b:.235294},cyan:{r:0,g:1,b:1},darkblue:{r:0,g:0,b:.545098},darkcyan:{r:0,g:.545098,b:.545098},darkgoldenrod:{r:.721569,g:.52549,b:.043137},darkgray:{r:.662745,g:.662745,b:.662745},darkgreen:{r:0,g:.392157,b:0},darkgrey:{r:.662745,g:.662745,b:.662745},darkkhaki:{r:.741176,g:.717647,b:.419608},darkmagenta:{r:.545098,g:0,b:.545098},darkolivegreen:{r:.333333,g:.419608,b:.184314},darkorange:{r:1,g:.54902,b:0},darkorchid:{r:.6,g:.196078,b:.8},darkred:{r:.545098,g:0,b:0},darksalmon:{r:.913725,g:.588235,b:.478431},darkseagreen:{r:.560784,g:.737255,b:.560784},darkslateblue:{r:.282353,g:.239216,b:.545098},darkslategray:{r:.184314,g:.309804,b:.309804},darkslategrey:{r:.184314,g:.309804,b:.309804},darkturquoise:{r:0,g:.807843,b:.819608},darkviolet:{r:.580392,g:0,b:.827451},deeppink:{r:1,g:.078431,b:.576471},deepskyblue:{r:0,g:.74902,b:1},dimgray:{r:.411765,g:.411765,b:.411765},dimgrey:{r:.411765,g:.411765,b:.411765},dodgerblue:{r:.117647,g:.564706,b:1},firebrick:{r:.698039,g:.133333,b:.133333},floralwhite:{r:1,g:.980392,b:.941176},forestgreen:{r:.133333,g:.545098,b:.133333},fuchsia:{r:1,g:0,b:1},gainsboro:{r:.862745,g:.862745,b:.862745},ghostwhite:{r:.972549,g:.972549,b:1},gold:{r:1,g:.843137,b:0},goldenrod:{r:.854902,g:.647059,b:.12549},gray:{r:.501961,g:.501961,b:.501961},green:{r:0,g:.501961,b:0},greenyellow:{r:.678431,g:1,b:.184314},grey:{r:.501961,g:.501961,b:.501961},honeydew:{r:.941176,g:1,b:.941176},hotpink:{r:1,g:.411765,b:.705882},indianred:{r:.803922,g:.360784,b:.360784},indigo:{r:.294118,g:0,b:.509804},ivory:{r:1,g:1,b:.941176},khaki:{r:.941176,g:.901961,b:.54902},lavender:{r:.901961,g:.901961,b:.980392},lavenderblush:{r:1,g:.941176,b:.960784},lawngreen:{r:.486275,g:.988235,b:0},lemonchiffon:{r:1,g:.980392,b:.803922},lightblue:{r:.678431,g:.847059,b:.901961},lightcoral:{r:.941176,g:.501961,b:.501961},lightcyan:{r:.878431,g:1,b:1},lightgoldenrodyellow:{r:.980392,g:.980392,b:.823529},lightgray:{r:.827451,g:.827451,b:.827451},lightgreen:{r:.564706,g:.933333,b:.564706},lightgrey:{r:.827451,g:.827451,b:.827451},lightpink:{r:1,g:.713725,b:.756863},lightsalmon:{r:1,g:.627451,b:.478431},lightseagreen:{r:.12549,g:.698039,b:.666667},lightskyblue:{r:.529412,g:.807843,b:.980392},lightslategray:{r:.466667,g:.533333,b:.6},lightslategrey:{r:.466667,g:.533333,b:.6},lightsteelblue:{r:.690196,g:.768627,b:.870588},lightyellow:{r:1,g:1,b:.878431},lime:{r:0,g:1,b:0},limegreen:{r:.196078,g:.803922,b:.196078},linen:{r:.980392,g:.941176,b:.901961},magenta:{r:1,g:0,b:1},maroon:{r:.501961,g:0,b:0},mediumaquamarine:{r:.4,g:.803922,b:.666667},mediumblue:{r:0,g:0,b:.803922},mediumorchid:{r:.729412,g:.333333,b:.827451},mediumpurple:{r:.576471,g:.439216,b:.858824},mediumseagreen:{r:.235294,g:.701961,b:.443137},mediumslateblue:{r:.482353,g:.407843,b:.933333},mediumspringgreen:{r:0,g:.980392,b:.603922},mediumturquoise:{r:.282353,g:.819608,b:.8},mediumvioletred:{r:.780392,g:.082353,b:.521569},midnightblue:{r:.098039,g:.098039,b:.439216},mintcream:{r:.960784,g:1,b:.980392},mistyrose:{r:1,g:.894118,b:.882353},moccasin:{r:1,g:.894118,b:.709804},navajowhite:{r:1,g:.870588,b:.678431},navy:{r:0,g:0,b:.501961},oldlace:{r:.992157,g:.960784,b:.901961},olive:{r:.501961,g:.501961,b:0},olivedrab:{r:.419608,g:.556863,b:.137255},orange:{r:1,g:.647059,b:0},orangered:{r:1,g:.270588,b:0},orchid:{r:.854902,g:.439216,b:.839216},palegoldenrod:{r:.933333,g:.909804,b:.666667},palegreen:{r:.596078,g:.984314,b:.596078},paleturquoise:{r:.686275,g:.933333,b:.933333},palevioletred:{r:.858824,g:.439216,b:.576471},papayawhip:{r:1,g:.937255,b:.835294},peachpuff:{r:1,g:.854902,b:.72549},peru:{r:.803922,g:.521569,b:.247059},pink:{r:1,g:.752941,b:.796078},plum:{r:.866667,g:.627451,b:.866667},powderblue:{r:.690196,g:.878431,b:.901961},purple:{r:.501961,g:0,b:.501961},red:{r:1,g:0,b:0},rosybrown:{r:.737255,g:.560784,b:.560784},royalblue:{r:.254902,g:.411765,b:.882353},saddlebrown:{r:.545098,g:.270588,b:.07451},salmon:{r:.980392,g:.501961,b:.447059},sandybrown:{r:.956863,g:.643137,b:.376471},seagreen:{r:.180392,g:.545098,b:.341176},seashell:{r:1,g:.960784,b:.933333},sienna:{r:.627451,g:.321569,b:.176471},silver:{r:.752941,g:.752941,b:.752941},skyblue:{r:.529412,g:.807843,b:.921569},slateblue:{r:.415686,g:.352941,b:.803922},slategray:{r:.439216,g:.501961,b:.564706},slategrey:{r:.439216,g:.501961,b:.564706},snow:{r:1,g:.980392,b:.980392},springgreen:{r:0,g:1,b:.498039},steelblue:{r:.27451,g:.509804,b:.705882},tan:{r:.823529,g:.705882,b:.54902},teal:{r:0,g:.501961,b:.501961},thistle:{r:.847059,g:.74902,b:.847059},tomato:{r:1,g:.388235,b:.278431},transparent:{r:0,g:0,b:0,a:0},turquoise:{r:.25098,g:.878431,b:.815686},violet:{r:.933333,g:.509804,b:.933333},wheat:{r:.960784,g:.870588,b:.701961},white:{r:1,g:1,b:1},whitesmoke:{r:.960784,g:.960784,b:.960784},yellow:{r:1,g:1,b:0},yellowgreen:{r:.603922,g:.803922,b:.196078}},u=/^rgb\(\s*((?:(?:25[0-5]|2[0-4]\d|1\d\d|\d{1,2})\s*,\s*){2}(?:25[0-5]|2[0-4]\d|1\d\d|\d{1,2})\s*)\)$/i,p=/^rgba\(\s*((?:(?:25[0-5]|2[0-4]\d|1\d\d|\d{1,2})\s*,\s*){3}(?:0|1|0?\.\d*)\s*)\)$/i,g=/^#((?:[0-9a-f]{6}|[0-9a-f]{3}))$/i,b=/^#((?:[0-9a-f]{8}|[0-9a-f]{4}))$/i;function f(e){const t=g.exec(e);if(null===t)return null;let o=t[1];if(3===o.length){const e=o.charAt(0),t=o.charAt(1),r=o.charAt(2);o=e.concat(e,t,t,r,r)}const r=parseInt(o,16);return isNaN(r)?null:new d(a((16711680&r)>>>16,0,255),a((65280&r)>>>8,0,255),a(255&r,0,255),1)}function m(e){const t=e.toLowerCase();return function(e){return g.test(e)}(t)?f(t):function(e){return function(e){return b.test(e)}(e)}(t)?function(e){const t=b.exec(e);if(null===t)return null;let o=t[1];if(4===o.length){const e=o.charAt(0),t=o.charAt(1),r=o.charAt(2),a=o.charAt(3);o=e.concat(e,t,t,r,r,a,a)}const r=parseInt(o,16);return isNaN(r)?null:new d(a((16711680&r)>>>16,0,255),a((65280&r)>>>8,0,255),a(255&r,0,255),a((4278190080&r)>>>24,0,255))}(t):function(e){return u.test(e)}(t)?function(e){const t=u.exec(e);if(null===t)return null;const o=t[1].split(",");return new d(a(Number(o[0]),0,255),a(Number(o[1]),0,255),a(Number(o[2]),0,255),1)}(t):function(e){return p.test(e)}(t)?function(e){const t=p.exec(e);if(null===t)return null;const o=t[1].split(",");return 4===o.length?new d(a(Number(o[0]),0,255),a(Number(o[1]),0,255),a(Number(o[2]),0,255),Number(o[3])):null}(t):function(e){return h.hasOwnProperty(e)}(t)?function(e){const t=h[e.toLowerCase()];return t?new d(t.r,t.g,t.b,t.hasOwnProperty("a")?t.a:void 0):null}(t):null}class v{constructor(e,t,o){this.h=e,this.s=t,this.l=o}static fromObject(e){return!e||isNaN(e.h)||isNaN(e.s)||isNaN(e.l)?null:new v(e.h,e.s,e.l)}equalValue(e){return this.h===e.h&&this.s===e.s&&this.l===e.l}roundToPrecision(e){return new v(c(this.h,e),c(this.s,e),c(this.l,e))}toObject(){return{h:this.h,s:this.s,l:this.l}}}class ${constructor(e,t,o){this.h=e,this.s=t,this.v=o}static fromObject(e){return!e||isNaN(e.h)||isNaN(e.s)||isNaN(e.v)?null:new $(e.h,e.s,e.v)}equalValue(e){return this.h===e.h&&this.s===e.s&&this.v===e.v}roundToPrecision(e){return new $(c(this.h,e),c(this.s,e),c(this.v,e))}toObject(){return{h:this.h,s:this.s,v:this.v}}}class x{constructor(e,t,o){this.l=e,this.a=t,this.b=o}static fromObject(e){return!e||isNaN(e.l)||isNaN(e.a)||isNaN(e.b)?null:new x(e.l,e.a,e.b)}equalValue(e){return this.l===e.l&&this.a===e.a&&this.b===e.b}roundToPrecision(e){return new x(c(this.l,e),c(this.a,e),c(this.b,e))}toObject(){return{l:this.l,a:this.a,b:this.b}}}x.epsilon=216/24389,x.kappa=24389/27;class y{constructor(e,t,o){this.l=e,this.c=t,this.h=o}static fromObject(e){return!e||isNaN(e.l)||isNaN(e.c)||isNaN(e.h)?null:new y(e.l,e.c,e.h)}equalValue(e){return this.l===e.l&&this.c===e.c&&this.h===e.h}roundToPrecision(e){return new y(c(this.l,e),c(this.c,e),c(this.h,e))}toObject(){return{l:this.l,c:this.c,h:this.h}}}class w{constructor(e,t,o){this.x=e,this.y=t,this.z=o}static fromObject(e){return!e||isNaN(e.x)||isNaN(e.y)||isNaN(e.z)?null:new w(e.x,e.y,e.z)}equalValue(e){return this.x===e.x&&this.y===e.y&&this.z===e.z}roundToPrecision(e){return new w(c(this.x,e),c(this.y,e),c(this.z,e))}toObject(){return{x:this.x,y:this.y,z:this.z}}}function k(e){return.2126*e.r+.7152*e.g+.0722*e.b}function F(e){function t(e){return e<=.03928?e/12.92:Math.pow((e+.055)/1.055,2.4)}return k(new d(t(e.r),t(e.g),t(e.b),1))}w.whitePoint=new w(.95047,1,1.08883);const C=(e,t)=>(e+.05)/(t+.05);function V(e,t){const o=F(e),r=F(t);return o>r?C(o,r):C(r,o)}function S(e){const t=Math.max(e.r,e.g,e.b),o=Math.min(e.r,e.g,e.b),r=t-o;let a=0;0!==r&&(a=t===e.r?(e.g-e.b)/r%6*60:t===e.g?60*((e.b-e.r)/r+2):60*((e.r-e.g)/r+4)),a<0&&(a+=360);const i=(t+o)/2;let l=0;return 0!==r&&(l=r/(1-Math.abs(2*i-1))),new v(a,l,i)}function D(e,t=1){const o=(1-Math.abs(2*e.l-1))*e.s,r=o*(1-Math.abs(e.h/60%2-1)),a=e.l-o/2;let i=0,l=0,n=0;return e.h<60?(i=o,l=r,n=0):e.h<120?(i=r,l=o,n=0):e.h<180?(i=0,l=o,n=r):e.h<240?(i=0,l=r,n=o):e.h<300?(i=r,l=0,n=o):e.h<360&&(i=o,l=0,n=r),new d(i+a,l+a,n+a,t)}function T(e){const t=Math.max(e.r,e.g,e.b),o=t-Math.min(e.r,e.g,e.b);let r=0;0!==o&&(r=t===e.r?(e.g-e.b)/o%6*60:t===e.g?60*((e.b-e.r)/o+2):60*((e.r-e.g)/o+4)),r<0&&(r+=360);let a=0;return 0!==t&&(a=o/t),new $(r,a,t)}function z(e){function t(e){return e<=.04045?e/12.92:Math.pow((e+.055)/1.055,2.4)}const o=t(e.r),r=t(e.g),a=t(e.b);return new w(.4124564*o+.3575761*r+.1804375*a,.2126729*o+.7151522*r+.072175*a,.0193339*o+.119192*r+.9503041*a)}function B(e,t=1){function o(e){return e<=.0031308?12.92*e:1.055*Math.pow(e,1/2.4)-.055}const r=o(3.2404542*e.x-1.5371385*e.y-.4985314*e.z),a=o(-.969266*e.x+1.8760108*e.y+.041556*e.z),i=o(.0556434*e.x-.2040259*e.y+1.0572252*e.z);return new d(r,a,i,t)}function j(e){return function(e){function t(e){return e>x.epsilon?Math.pow(e,1/3):(x.kappa*e+16)/116}const o=t(e.x/w.whitePoint.x),r=t(e.y/w.whitePoint.y),a=t(e.z/w.whitePoint.z);return new x(116*r-16,500*(o-r),200*(r-a))}(z(e))}function L(e,t=1){return B(function(e){const t=(e.l+16)/116,o=t+e.a/500,r=t-e.b/200,a=Math.pow(o,3),i=Math.pow(t,3),l=Math.pow(r,3);let n=0;n=a>x.epsilon?a:(116*o-16)/x.kappa;let s=0;s=e.l>x.epsilon*x.kappa?i:e.l/x.kappa;let c=0;return c=l>x.epsilon?l:(116*r-16)/x.kappa,n=w.whitePoint.x*n,s=w.whitePoint.y*s,c=w.whitePoint.z*c,new w(n,s,c)}(e),t)}function N(e){return function(e){let t=0;(Math.abs(e.b)>.001||Math.abs(e.a)>.001)&&(t=Math.atan2(e.b,e.a)*(180/Math.PI)),t<0&&(t+=360);const o=Math.sqrt(e.a*e.a+e.b*e.b);return new y(e.l,o,t)}(j(e))}function H(e,t=1){return L(function(e){let t=0,o=0;return 0!==e.h&&(t=Math.cos(l(e.h))*e.c,o=Math.sin(l(e.h))*e.c),new x(e.l,t,o)}(e),t)}function O(e,t){const o=e.relativeLuminance>t.relativeLuminance?e:t,r=e.relativeLuminance>t.relativeLuminance?t:e;return(o.relativeLuminance+.05)/(r.relativeLuminance+.05)}const R=Object.freeze({create:(e,t,o)=>new P(e,t,o),from:e=>new P(e.r,e.g,e.b)});class P extends d{constructor(e,t,o){super(e,t,o,1),this.toColorString=this.toStringHexRGB,this.contrast=O.bind(null,this),this.createCSS=this.toColorString,this.relativeLuminance=F(this)}static fromObject(e){return new P(e.r,e.g,e.b)}}function I(e){return R.create(e,e,e)}const A={LightMode:1,DarkMode:.23},M=(-.1+Math.sqrt(.21))/2;function G(e){return e.relativeLuminance<=M}var E,_,q=o(31327),W=o(6618);function U(e,t,o=18){const r=N(e);let a=r.c+t*o;return a<0&&(a=0),H(new y(r.l,a,r.h))}function X(e,t){return e*t}function Y(e,t){return new d(X(e.r,t.r),X(e.g,t.g),X(e.b,t.b),1)}function Z(e,t){return r(e<.5?2*t*e:1-2*(1-t)*(1-e),0,1)}function J(e,t){return new d(Z(e.r,t.r),Z(e.g,t.g),Z(e.b,t.b),1)}function K(e,t,o,r){if(isNaN(e)||e<=0)return o;if(e>=1)return r;switch(t){case _.HSL:return D(function(e,t,o){return isNaN(e)||e<=0?t:e>=1?o:new v(s(e,t.h,o.h),n(e,t.s,o.s),n(e,t.l,o.l))}(e,S(o),S(r)));case _.HSV:return function(e,t=1){const o=e.s*e.v,r=o*(1-Math.abs(e.h/60%2-1)),a=e.v-o;let i=0,l=0,n=0;return e.h<60?(i=o,l=r,n=0):e.h<120?(i=r,l=o,n=0):e.h<180?(i=0,l=o,n=r):e.h<240?(i=0,l=r,n=o):e.h<300?(i=r,l=0,n=o):e.h<360&&(i=o,l=0,n=r),new d(i+a,l+a,n+a,t)}(function(e,t,o){return isNaN(e)||e<=0?t:e>=1?o:new $(s(e,t.h,o.h),n(e,t.s,o.s),n(e,t.v,o.v))}(e,T(o),T(r)));case _.XYZ:return B(function(e,t,o){return isNaN(e)||e<=0?t:e>=1?o:new w(n(e,t.x,o.x),n(e,t.y,o.y),n(e,t.z,o.z))}(e,z(o),z(r)));case _.LAB:return L(function(e,t,o){return isNaN(e)||e<=0?t:e>=1?o:new x(n(e,t.l,o.l),n(e,t.a,o.a),n(e,t.b,o.b))}(e,j(o),j(r)));case _.LCH:return H(function(e,t,o){return isNaN(e)||e<=0?t:e>=1?o:new y(n(e,t.l,o.l),n(e,t.c,o.c),s(e,t.h,o.h))}(e,N(o),N(r)));default:return function(e,t,o){return isNaN(e)||e<=0?t:e>=1?o:new d(n(e,t.r,o.r),n(e,t.g,o.g),n(e,t.b,o.b),n(e,t.a,o.a))}(e,o,r)}}!function(e){e[e.Burn=0]="Burn",e[e.Color=1]="Color",e[e.Darken=2]="Darken",e[e.Dodge=3]="Dodge",e[e.Lighten=4]="Lighten",e[e.Multiply=5]="Multiply",e[e.Overlay=6]="Overlay",e[e.Screen=7]="Screen"}(E||(E={})),function(e){e[e.RGB=0]="RGB",e[e.HSL=1]="HSL",e[e.HSV=2]="HSV",e[e.XYZ=3]="XYZ",e[e.LAB=4]="LAB",e[e.LCH=5]="LCH"}(_||(_={}));class Q{constructor(e){if(null==e||0===e.length)throw new Error("The stops argument must be non-empty");this.stops=this.sortColorScaleStops(e)}static createBalancedColorScale(e){if(null==e||0===e.length)throw new Error("The colors argument must be non-empty");const t=new Array(e.length);for(let o=0;o<e.length;o++)0===o?t[o]={color:e[o],position:0}:o===e.length-1?t[o]={color:e[o],position:1}:t[o]={color:e[o],position:o*(1/(e.length-1))};return new Q(t)}getColor(e,t=_.RGB){if(1===this.stops.length)return this.stops[0].color;if(e<=0)return this.stops[0].color;if(e>=1)return this.stops[this.stops.length-1].color;let o=0;for(let t=0;t<this.stops.length;t++)this.stops[t].position<=e&&(o=t);let r=o+1;return r>=this.stops.length&&(r=this.stops.length-1),K((e-this.stops[o].position)*(1/(this.stops[r].position-this.stops[o].position)),t,this.stops[o].color,this.stops[r].color)}trim(e,t,o=_.RGB){if(e<0||t>1||t<e)throw new Error("Invalid bounds");if(e===t)return new Q([{color:this.getColor(e,o),position:0}]);const r=[];for(let o=0;o<this.stops.length;o++)this.stops[o].position>=e&&this.stops[o].position<=t&&r.push(this.stops[o]);if(0===r.length)return new Q([{color:this.getColor(e),position:e},{color:this.getColor(t),position:t}]);r[0].position!==e&&r.unshift({color:this.getColor(e),position:e}),r[r.length-1].position!==t&&r.push({color:this.getColor(t),position:t});const a=t-e,i=new Array(r.length);for(let t=0;t<r.length;t++)i[t]={color:r[t].color,position:(r[t].position-e)/a};return new Q(i)}findNextColor(e,t,o=!1,r=_.RGB,a=.005,i=32){isNaN(e)||e<=0?e=0:e>=1&&(e=1);const l=this.getColor(e,r),n=o?0:1;if(V(l,this.getColor(n,r))<=t)return n;let s=o?0:e,c=o?e:0,d=n,h=0;for(;h<=i;){d=Math.abs(c-s)/2+s;const e=V(l,this.getColor(d,r));if(Math.abs(e-t)<=a)return d;e>t?o?s=d:c=d:o?c=d:s=d,h++}return d}clone(){const e=new Array(this.stops.length);for(let t=0;t<e.length;t++)e[t]={color:this.stops[t].color,position:this.stops[t].position};return new Q(e)}sortColorScaleStops(e){return e.sort(((e,t)=>{const o=e.position,r=t.position;return o<r?-1:o>r?1:0}))}}class ee{constructor(e){this.config=Object.assign({},ee.defaultPaletteConfig,e),this.palette=[],this.updatePaletteColors()}updatePaletteGenerationValues(e){let t=!1;for(const o in e)this.config[o]&&(this.config[o].equalValue?this.config[o].equalValue(e[o])||(this.config[o]=e[o],t=!0):e[o]!==this.config[o]&&(this.config[o]=e[o],t=!0));return t&&this.updatePaletteColors(),t}updatePaletteColors(){const e=this.generatePaletteColorScale();for(let t=0;t<this.config.steps;t++)this.palette[t]=e.getColor(t/(this.config.steps-1),this.config.interpolationMode)}generatePaletteColorScale(){const e=S(this.config.baseColor),t=new Q([{position:0,color:this.config.scaleColorLight},{position:.5,color:this.config.baseColor},{position:1,color:this.config.scaleColorDark}]).trim(this.config.clipLight,1-this.config.clipDark);let o=t.getColor(0),r=t.getColor(1);if(e.s>=this.config.saturationAdjustmentCutoff&&(o=U(o,this.config.saturationLight),r=U(r,this.config.saturationDark)),0!==this.config.multiplyLight){const e=Y(this.config.baseColor,o);o=K(this.config.multiplyLight,this.config.interpolationMode,o,e)}if(0!==this.config.multiplyDark){const e=Y(this.config.baseColor,r);r=K(this.config.multiplyDark,this.config.interpolationMode,r,e)}if(0!==this.config.overlayLight){const e=J(this.config.baseColor,o);o=K(this.config.overlayLight,this.config.interpolationMode,o,e)}if(0!==this.config.overlayDark){const e=J(this.config.baseColor,r);r=K(this.config.overlayDark,this.config.interpolationMode,r,e)}return this.config.baseScalePosition?this.config.baseScalePosition<=0?new Q([{position:0,color:this.config.baseColor},{position:1,color:r.clamp()}]):this.config.baseScalePosition>=1?new Q([{position:0,color:o.clamp()},{position:1,color:this.config.baseColor}]):new Q([{position:0,color:o.clamp()},{position:this.config.baseScalePosition,color:this.config.baseColor},{position:1,color:r.clamp()}]):new Q([{position:0,color:o.clamp()},{position:.5,color:this.config.baseColor},{position:1,color:r.clamp()}])}}ee.defaultPaletteConfig={baseColor:f("#808080"),steps:11,interpolationMode:_.RGB,scaleColorLight:new d(1,1,1,1),scaleColorDark:new d(0,0,0,1),clipLight:.185,clipDark:.16,saturationAdjustmentCutoff:.05,saturationLight:.35,saturationDark:1.25,overlayLight:0,overlayDark:.25,multiplyLight:0,multiplyDark:0,baseScalePosition:.5},ee.greyscalePaletteConfig={baseColor:f("#808080"),steps:11,interpolationMode:_.RGB,scaleColorLight:new d(1,1,1,1),scaleColorDark:new d(0,0,0,1),clipLight:0,clipDark:0,saturationAdjustmentCutoff:0,saturationLight:0,saturationDark:0,overlayLight:0,overlayDark:0,multiplyLight:0,multiplyDark:0,baseScalePosition:.5},ee.defaultPaletteConfig.scaleColorLight,ee.defaultPaletteConfig.scaleColorDark;class te{constructor(e){this.palette=[],this.config=Object.assign({},te.defaultPaletteConfig,e),this.regenPalettes()}regenPalettes(){let e=this.config.steps;(isNaN(e)||e<3)&&(e=3);const t=.14,o=new d(t,t,t,1),r=new ee(Object.assign(Object.assign({},ee.greyscalePaletteConfig),{baseColor:o,baseScalePosition:86/94,steps:e})).palette,a=(k(this.config.baseColor)+S(this.config.baseColor).l)/2,i=this.matchRelativeLuminanceIndex(a,r)/(e-1),l=this.matchRelativeLuminanceIndex(t,r)/(e-1),n=S(this.config.baseColor),s=D(v.fromObject({h:n.h,s:n.s,l:t})),c=D(v.fromObject({h:n.h,s:n.s,l:.06})),h=new Array(5);h[0]={position:0,color:new d(1,1,1,1)},h[1]={position:i,color:this.config.baseColor},h[2]={position:l,color:s},h[3]={position:.99,color:c},h[4]={position:1,color:new d(0,0,0,1)};const u=new Q(h);this.palette=new Array(e);for(let t=0;t<e;t++){const o=u.getColor(t/(e-1),_.RGB);this.palette[t]=o}}matchRelativeLuminanceIndex(e,t){let o=Number.MAX_VALUE,r=0,a=0;const i=t.length;for(;a<i;a++){const i=Math.abs(k(t[a])-e);i<o&&(o=i,r=a)}return r}}function oe(e,t,o=0,r=e.length-1){if(r===o)return e[o];const a=Math.floor((r-o)/2)+o;return t(e[a])?oe(e,t,o,a):oe(e,t,a+1,r)}function re(e){return G(e)?-1:1}te.defaultPaletteConfig={baseColor:f("#808080"),steps:94};const ae=Object.freeze({create:function(e,t,o){return"number"==typeof e?ae.from(R.create(e,t,o)):ae.from(e)},from:function(e){return function(e){const t={r:0,g:0,b:0,toColorString:()=>"",contrast:()=>0,relativeLuminance:0};for(const o in t)if(typeof t[o]!=typeof e[o])return!1;return!0}(e)?ie.from(e):ie.from(R.create(e.r,e.g,e.b))}});class ie{constructor(e,t){this.closestIndexCache=new Map,this.source=e,this.swatches=t,this.reversedSwatches=Object.freeze([...this.swatches].reverse()),this.lastIndex=this.swatches.length-1}colorContrast(e,t,o,r){void 0===o&&(o=this.closestIndexOf(e));let a=this.swatches;const i=this.lastIndex;let l=o;return void 0===r&&(r=re(e)),-1===r&&(a=this.reversedSwatches,l=i-l),oe(a,(o=>O(e,o)>=t),l,i)}get(e){return this.swatches[e]||this.swatches[r(e,0,this.lastIndex)]}closestIndexOf(e){if(this.closestIndexCache.has(e.relativeLuminance))return this.closestIndexCache.get(e.relativeLuminance);let t=this.swatches.indexOf(e);if(-1!==t)return this.closestIndexCache.set(e.relativeLuminance,t),t;const o=this.swatches.reduce(((t,o)=>Math.abs(o.relativeLuminance-e.relativeLuminance)<Math.abs(t.relativeLuminance-e.relativeLuminance)?o:t));return t=this.swatches.indexOf(o),this.closestIndexCache.set(e.relativeLuminance,t),t}static from(e){return new ie(e,Object.freeze(new te({baseColor:d.fromObject(e)}).palette.map((e=>{const t=f(e.toStringHexRGB());return R.create(t.r,t.g,t.b)}))))}}const le=R.create(1,1,1),ne=R.create(0,0,0),se=R.from(f("#808080")),ce=R.from(f("#DA1A5F")),de=R.from(f("#D32F2F"));function he(e,t,o,r,a,i){return Math.max(e.closestIndexOf(I(t))+o,r,a,i)}const{create:ue}=q.DesignToken;function pe(e){return q.DesignToken.create({name:e,cssCustomPropertyName:null})}const ge=ue("body-font").withDefault('aktiv-grotesk, "Segoe UI", Arial, Helvetica, sans-serif'),be=ue("base-height-multiplier").withDefault(10),fe=ue("base-horizontal-spacing-multiplier").withDefault(3),me=ue("base-layer-luminance").withDefault(A.DarkMode),ve=ue("control-corner-radius").withDefault(4),$e=ue("density").withDefault(0),xe=ue("design-unit").withDefault(4),ye=ue("element-scale").withDefault(0),we=ue("direction").withDefault(W.N.ltr),ke=ue("disabled-opacity").withDefault(.4),Fe=ue("stroke-width").withDefault(1),Ce=ue("focus-stroke-width").withDefault(2),Ve=ue("type-ramp-base-font-size").withDefault("14px"),Se=ue("type-ramp-base-line-height").withDefault("20px"),De=ue("type-ramp-minus-1-font-size").withDefault("12px"),Te=ue("type-ramp-minus-1-line-height").withDefault("16px"),ze=ue("type-ramp-minus-2-font-size").withDefault("10px"),Be=ue("type-ramp-minus-2-line-height").withDefault("16px"),je=ue("type-ramp-plus-1-font-size").withDefault("16px"),Le=ue("type-ramp-plus-1-line-height").withDefault("24px"),Ne=ue("type-ramp-plus-2-font-size").withDefault("20px"),He=ue("type-ramp-plus-2-line-height").withDefault("28px"),Oe=ue("type-ramp-plus-3-font-size").withDefault("28px"),Re=ue("type-ramp-plus-3-line-height").withDefault("36px"),Pe=ue("type-ramp-plus-4-font-size").withDefault("34px"),Ie=ue("type-ramp-plus-4-line-height").withDefault("44px"),Ae=ue("type-ramp-plus-5-font-size").withDefault("46px"),Me=ue("type-ramp-plus-5-line-height").withDefault("56px"),Ge=ue("type-ramp-plus-6-font-size").withDefault("60px"),Ee=ue("type-ramp-plus-6-line-height").withDefault("72px"),_e=pe("accent-fill-rest-delta").withDefault(0),qe=pe("accent-fill-hover-delta").withDefault(4),We=pe("accent-fill-active-delta").withDefault(-5),Ue=pe("accent-fill-focus-delta").withDefault(0),Xe=pe("accent-foreground-rest-delta").withDefault(0),Ye=pe("accent-foreground-hover-delta").withDefault(6),Ze=pe("accent-foreground-active-delta").withDefault(-4),Je=pe("accent-foreground-focus-delta").withDefault(0),Ke=pe("neutral-fill-rest-delta").withDefault(7),Qe=pe("neutral-fill-hover-delta").withDefault(10),et=pe("neutral-fill-active-delta").withDefault(5),tt=pe("neutral-fill-focus-delta").withDefault(0),ot=pe("neutral-fill-input-rest-delta").withDefault(0),rt=pe("neutral-fill-input-hover-delta").withDefault(0),at=pe("neutral-fill-input-active-delta").withDefault(0),it=pe("neutral-fill-input-focus-delta").withDefault(0),lt=pe("neutral-fill-stealth-rest-delta").withDefault(0),nt=pe("neutral-fill-stealth-hover-delta").withDefault(5),st=pe("neutral-fill-stealth-active-delta").withDefault(3),ct=pe("neutral-fill-stealth-focus-delta").withDefault(0),dt=pe("neutral-fill-strong-rest-delta").withDefault(0),ht=pe("neutral-fill-strong-hover-delta").withDefault(8),ut=pe("neutral-fill-strong-active-delta").withDefault(-5),pt=pe("neutral-fill-strong-focus-delta").withDefault(0),gt=pe("neutral-fill-layer-rest-delta").withDefault(3),bt=pe("neutral-stroke-rest-delta").withDefault(25),ft=pe("neutral-stroke-hover-delta").withDefault(40),mt=pe("neutral-stroke-active-delta").withDefault(16),vt=pe("neutral-stroke-focus-delta").withDefault(25),$t=pe("neutral-stroke-divider-rest-delta").withDefault(8),xt=ue("neutral-color").withDefault(se),yt=pe("neutral-palette").withDefault((e=>ae.from(xt.getValueFor(e)))),wt=ue("accent-color").withDefault(ce),kt=pe("accent-palette").withDefault((e=>ae.from(wt.getValueFor(e)))),Ft=pe("neutral-layer-card-container-recipe").withDefault({evaluate:e=>{return t=yt.getValueFor(e),o=me.getValueFor(e),r=gt.getValueFor(e),t.get(t.closestIndexOf(I(o))+r);var t,o,r}}),Ct=ue("neutral-layer-card-container").withDefault((e=>Ft.getValueFor(e).evaluate(e))),Vt=pe("neutral-layer-floating-recipe").withDefault({evaluate:e=>function(e,t,o){const r=e.closestIndexOf(I(t))-o;return e.get(r-o)}(yt.getValueFor(e),me.getValueFor(e),gt.getValueFor(e))}),St=ue("neutral-layer-floating").withDefault((e=>Vt.getValueFor(e).evaluate(e))),Dt=pe("neutral-layer-1-recipe").withDefault({evaluate:e=>function(e,t){return e.get(e.closestIndexOf(I(t)))}(yt.getValueFor(e),me.getValueFor(e))}),Tt=ue("neutral-layer-1").withDefault((e=>Dt.getValueFor(e).evaluate(e))),zt=pe("neutral-layer-2-recipe").withDefault({evaluate:e=>{return t=yt.getValueFor(e),o=me.getValueFor(e),r=gt.getValueFor(e),a=Ke.getValueFor(e),i=Qe.getValueFor(e),l=et.getValueFor(e),t.get(he(t,o,r,a,i,l));var t,o,r,a,i,l}}),Bt=ue("neutral-layer-2").withDefault((e=>zt.getValueFor(e).evaluate(e))),jt=pe("neutral-layer-3-recipe").withDefault({evaluate:e=>{return t=yt.getValueFor(e),o=me.getValueFor(e),r=gt.getValueFor(e),a=Ke.getValueFor(e),i=Qe.getValueFor(e),l=et.getValueFor(e),t.get(he(t,o,r,a,i,l)+r);var t,o,r,a,i,l}}),Lt=ue("neutral-layer-3").withDefault((e=>jt.getValueFor(e).evaluate(e))),Nt=pe("neutral-layer-4-recipe").withDefault({evaluate:e=>{return t=yt.getValueFor(e),o=me.getValueFor(e),r=gt.getValueFor(e),a=Ke.getValueFor(e),i=Qe.getValueFor(e),l=et.getValueFor(e),t.get(he(t,o,r,a,i,l)+2*r);var t,o,r,a,i,l}}),Ht=ue("neutral-layer-4").withDefault((e=>Nt.getValueFor(e).evaluate(e))),Ot=ue("fill-color").withDefault((e=>Tt.getValueFor(e)));var Rt;!function(e){e[e.normal=4.5]="normal",e[e.large=7]="large"}(Rt||(Rt={}));const Pt=ue({name:"accent-fill-recipe",cssCustomPropertyName:null}).withDefault({evaluate:(e,t)=>function(e,t,o,r,a,i,l,n,s){const c=e.source,d=t.closestIndexOf(o)>=Math.max(l,n,s)?-1:1,h=e.closestIndexOf(c),u=h+-1*d*r,p=u+d*a,g=u+d*i;return{rest:e.get(u),hover:e.get(h),active:e.get(p),focus:e.get(g)}}(kt.getValueFor(e),yt.getValueFor(e),t||Ot.getValueFor(e),qe.getValueFor(e),We.getValueFor(e),Ue.getValueFor(e),Ke.getValueFor(e),Qe.getValueFor(e),et.getValueFor(e))}),It=ue("accent-fill-rest").withDefault((e=>Pt.getValueFor(e).evaluate(e).rest)),At=ue("accent-fill-hover").withDefault((e=>Pt.getValueFor(e).evaluate(e).hover)),Mt=ue("accent-fill-active").withDefault((e=>Pt.getValueFor(e).evaluate(e).active)),Gt=ue("accent-fill-focus").withDefault((e=>Pt.getValueFor(e).evaluate(e).focus)),Et=e=>(t,o)=>function(e,t){return e.contrast(le)>=t?le:ne}(o||It.getValueFor(t),e),_t=pe("foreground-on-accent-recipe").withDefault({evaluate:(e,t)=>Et(Rt.normal)(e,t)}),qt=ue("foreground-on-accent-rest").withDefault((e=>_t.getValueFor(e).evaluate(e,It.getValueFor(e)))),Wt=ue("foreground-on-accent-hover").withDefault((e=>_t.getValueFor(e).evaluate(e,At.getValueFor(e)))),Ut=ue("foreground-on-accent-active").withDefault((e=>_t.getValueFor(e).evaluate(e,Mt.getValueFor(e)))),Xt=ue("foreground-on-accent-focus").withDefault((e=>_t.getValueFor(e).evaluate(e,Gt.getValueFor(e)))),Yt=pe("foreground-on-accent-large-recipe").withDefault({evaluate:(e,t)=>Et(Rt.large)(e,t)}),Zt=ue("foreground-on-accent-rest-large").withDefault((e=>Yt.getValueFor(e).evaluate(e,It.getValueFor(e)))),Jt=ue("foreground-on-accent-hover-large").withDefault((e=>Yt.getValueFor(e).evaluate(e,At.getValueFor(e)))),Kt=ue("foreground-on-accent-active-large").withDefault((e=>Yt.getValueFor(e).evaluate(e,Mt.getValueFor(e)))),Qt=ue("foreground-on-accent-focus-large").withDefault((e=>Yt.getValueFor(e).evaluate(e,Gt.getValueFor(e)))),eo=ue({name:"accent-foreground-recipe",cssCustomPropertyName:null}).withDefault({evaluate:(e,t)=>(e=>(t,o)=>function(e,t,o,r,a,i,l){const n=e.source,s=e.closestIndexOf(n),c=re(t),d=s+(1===c?Math.min(r,a):Math.max(c*r,c*a)),h=e.colorContrast(t,o,d,c),u=e.closestIndexOf(h),p=u+c*Math.abs(r-a);let g,b;return(1===c?r<a:c*r>c*a)?(g=u,b=p):(g=p,b=u),{rest:e.get(g),hover:e.get(b),active:e.get(g+c*i),focus:e.get(g+c*l)}}(kt.getValueFor(t),o||Ot.getValueFor(t),e,Xe.getValueFor(t),Ye.getValueFor(t),Ze.getValueFor(t),Je.getValueFor(t)))(Rt.normal)(e,t)}),to=ue("accent-foreground-rest").withDefault((e=>eo.getValueFor(e).evaluate(e).rest)),oo=ue("accent-foreground-hover").withDefault((e=>eo.getValueFor(e).evaluate(e).hover)),ro=ue("accent-foreground-active").withDefault((e=>eo.getValueFor(e).evaluate(e).active)),ao=ue("accent-foreground-focus").withDefault((e=>eo.getValueFor(e).evaluate(e).focus)),io=ue({name:"neutral-fill-recipe",cssCustomPropertyName:null}).withDefault({evaluate:(e,t)=>function(e,t,o,r,a,i){const l=e.closestIndexOf(t),n=l>=Math.max(o,r,a,i)?-1:1;return{rest:e.get(l+n*o),hover:e.get(l+n*r),active:e.get(l+n*a),focus:e.get(l+n*i)}}(yt.getValueFor(e),t||Ot.getValueFor(e),Ke.getValueFor(e),Qe.getValueFor(e),et.getValueFor(e),tt.getValueFor(e))}),lo=ue("neutral-fill-rest").withDefault((e=>io.getValueFor(e).evaluate(e).rest)),no=ue("neutral-fill-hover").withDefault((e=>io.getValueFor(e).evaluate(e).hover)),so=ue("neutral-fill-active").withDefault((e=>io.getValueFor(e).evaluate(e).active)),co=ue("neutral-fill-focus").withDefault((e=>io.getValueFor(e).evaluate(e).focus)),ho=ue({name:"neutral-fill-input-recipe",cssCustomPropertyName:null}).withDefault({evaluate:(e,t)=>function(e,t,o,r,a,i){const l=re(t),n=e.closestIndexOf(t);return{rest:e.get(n-l*o),hover:e.get(n-l*r),active:e.get(n-l*a),focus:e.get(n-l*i)}}(yt.getValueFor(e),t||Ot.getValueFor(e),ot.getValueFor(e),rt.getValueFor(e),at.getValueFor(e),it.getValueFor(e))}),uo=ue("neutral-fill-input-rest").withDefault((e=>ho.getValueFor(e).evaluate(e).rest)),po=ue("neutral-fill-input-hover").withDefault((e=>ho.getValueFor(e).evaluate(e).hover)),go=ue("neutral-fill-input-active").withDefault((e=>ho.getValueFor(e).evaluate(e).active)),bo=ue("neutral-fill-input-focus").withDefault((e=>ho.getValueFor(e).evaluate(e).focus)),fo=ue({name:"neutral-fill-stealth-recipe",cssCustomPropertyName:null}).withDefault({evaluate:(e,t)=>function(e,t,o,r,a,i,l,n,s,c){const d=Math.max(o,r,a,i,l,n,s,c),h=e.closestIndexOf(t),u=h>=d?-1:1;return{rest:e.get(h+u*o),hover:e.get(h+u*r),active:e.get(h+u*a),focus:e.get(h+u*i)}}(yt.getValueFor(e),t||Ot.getValueFor(e),lt.getValueFor(e),nt.getValueFor(e),st.getValueFor(e),ct.getValueFor(e),Ke.getValueFor(e),Qe.getValueFor(e),et.getValueFor(e),tt.getValueFor(e))}),mo=ue("neutral-fill-stealth-rest").withDefault((e=>fo.getValueFor(e).evaluate(e).rest)),vo=ue("neutral-fill-stealth-hover").withDefault((e=>fo.getValueFor(e).evaluate(e).hover)),$o=ue("neutral-fill-stealth-active").withDefault((e=>fo.getValueFor(e).evaluate(e).active)),xo=ue("neutral-fill-stealth-focus").withDefault((e=>fo.getValueFor(e).evaluate(e).focus)),yo=ue({name:"neutral-fill-strong-recipe",cssCustomPropertyName:null}).withDefault({evaluate:(e,t)=>function(e,t,o,r,a,i){const l=re(t),n=e.closestIndexOf(e.colorContrast(t,4.5)),s=n+l*Math.abs(o-r);let c,d;return(1===l?o<r:l*o>l*r)?(c=n,d=s):(c=s,d=n),{rest:e.get(c),hover:e.get(d),active:e.get(c+l*a),focus:e.get(c+l*i)}}(yt.getValueFor(e),t||Ot.getValueFor(e),dt.getValueFor(e),ht.getValueFor(e),ut.getValueFor(e),pt.getValueFor(e))}),wo=ue("neutral-fill-strong-rest").withDefault((e=>yo.getValueFor(e).evaluate(e).rest)),ko=ue("neutral-fill-strong-hover").withDefault((e=>yo.getValueFor(e).evaluate(e).hover)),Fo=ue("neutral-fill-strong-active").withDefault((e=>yo.getValueFor(e).evaluate(e).active)),Co=ue("neutral-fill-strong-focus").withDefault((e=>yo.getValueFor(e).evaluate(e).focus)),Vo=pe("neutral-fill-layer-recipe").withDefault({evaluate:(e,t)=>function(e,t,o){const r=e.closestIndexOf(t);return e.get(r-(r<o?-1*o:o))}(yt.getValueFor(e),t||Ot.getValueFor(e),gt.getValueFor(e))}),So=ue("neutral-fill-layer-rest").withDefault((e=>Vo.getValueFor(e).evaluate(e))),Do=pe("focus-stroke-outer-recipe").withDefault({evaluate:e=>{return t=yt.getValueFor(e),o=Ot.getValueFor(e),t.colorContrast(o,3.5);var t,o}}),To=ue("focus-stroke-outer").withDefault((e=>Do.getValueFor(e).evaluate(e))),zo=pe("focus-stroke-inner-recipe").withDefault({evaluate:e=>{return t=kt.getValueFor(e),o=Ot.getValueFor(e),r=To.getValueFor(e),t.colorContrast(r,3.5,t.closestIndexOf(t.source),-1*re(o));var t,o,r}}),Bo=ue("focus-stroke-inner").withDefault((e=>zo.getValueFor(e).evaluate(e))),jo=pe("neutral-foreground-hint-recipe").withDefault({evaluate:e=>{return t=yt.getValueFor(e),o=Ot.getValueFor(e),t.colorContrast(o,4.5);var t,o}}),Lo=ue("neutral-foreground-hint").withDefault((e=>jo.getValueFor(e).evaluate(e))),No=pe("neutral-foreground-recipe").withDefault({evaluate:e=>{return t=yt.getValueFor(e),o=Ot.getValueFor(e),t.colorContrast(o,14);var t,o}}),Ho=ue("neutral-foreground-rest").withDefault((e=>No.getValueFor(e).evaluate(e))),Oo=ue({name:"neutral-stroke-recipe",cssCustomPropertyName:null}).withDefault({evaluate:e=>function(e,t,o,r,a,i){const l=e.closestIndexOf(t),n=re(t),s=l+n*o,c=s+n*(r-o),d=s+n*(a-o),h=s+n*(i-o);return{rest:e.get(s),hover:e.get(c),active:e.get(d),focus:e.get(h)}}(yt.getValueFor(e),Ot.getValueFor(e),bt.getValueFor(e),ft.getValueFor(e),mt.getValueFor(e),vt.getValueFor(e))}),Ro=ue("neutral-stroke-rest").withDefault((e=>Oo.getValueFor(e).evaluate(e).rest)),Po=ue("neutral-stroke-hover").withDefault((e=>Oo.getValueFor(e).evaluate(e).hover)),Io=ue("neutral-stroke-active").withDefault((e=>Oo.getValueFor(e).evaluate(e).active)),Ao=ue("neutral-stroke-focus").withDefault((e=>Oo.getValueFor(e).evaluate(e).focus)),Mo=pe("neutral-stroke-divider-recipe").withDefault({evaluate:(e,t)=>function(e,t,o){return e.get(e.closestIndexOf(t)+re(t)*o)}(yt.getValueFor(e),t||Ot.getValueFor(e),$t.getValueFor(e))}),Go=ue("neutral-stroke-divider-rest").withDefault((e=>Mo.getValueFor(e).evaluate(e))),Eo=q.DesignToken.create({name:"height-number",cssCustomPropertyName:null}).withDefault((e=>(be.getValueFor(e)+$e.getValueFor(e))*xe.getValueFor(e))),_o=ue("error-color").withDefault(de),qo=pe("error-palette").withDefault((e=>ae.from(_o.getValueFor(e)))),Wo=ue({name:"error-fill-recipe",cssCustomPropertyName:null}).withDefault({evaluate:(e,t)=>function(e,t,o,r,a,i,l,n,s){const c=e.source,d=t.closestIndexOf(o)>=Math.max(l,n,s)?-1:1,h=e.closestIndexOf(c),u=h+-1*d*r,p=u+d*a,g=u+d*i;return{rest:e.get(u),hover:e.get(h),active:e.get(p),focus:e.get(g)}}(qo.getValueFor(e),yt.getValueFor(e),t||Ot.getValueFor(e),qe.getValueFor(e),We.getValueFor(e),Ue.getValueFor(e),Ke.getValueFor(e),Qe.getValueFor(e),et.getValueFor(e))}),Uo=ue("error-fill-rest").withDefault((e=>Wo.getValueFor(e).evaluate(e).rest)),Xo=ue("error-fill-hover").withDefault((e=>Wo.getValueFor(e).evaluate(e).hover)),Yo=ue("error-fill-active").withDefault((e=>Wo.getValueFor(e).evaluate(e).active)),Zo=ue("error-fill-focus").withDefault((e=>Wo.getValueFor(e).evaluate(e).focus)),Jo=e=>(t,o)=>function(e,t){return e.contrast(le)>=t?le:ne}(o||Uo.getValueFor(t),e),Ko=ue({name:"foreground-on-error-recipe",cssCustomPropertyName:null}).withDefault({evaluate:(e,t)=>Jo(Rt.normal)(e,t)}),Qo=ue("foreground-on-error-rest").withDefault((e=>Ko.getValueFor(e).evaluate(e,Uo.getValueFor(e)))),er=ue("foreground-on-error-hover").withDefault((e=>Ko.getValueFor(e).evaluate(e,Xo.getValueFor(e)))),tr=ue("foreground-on-error-active").withDefault((e=>Ko.getValueFor(e).evaluate(e,Yo.getValueFor(e)))),or=ue("foreground-on-error-focus").withDefault((e=>Ko.getValueFor(e).evaluate(e,Zo.getValueFor(e)))),rr=ue({name:"foreground-on-error-large-recipe",cssCustomPropertyName:null}).withDefault({evaluate:(e,t)=>Jo(Rt.large)(e,t)}),ar=ue("foreground-on-error-rest-large").withDefault((e=>rr.getValueFor(e).evaluate(e,Uo.getValueFor(e)))),ir=ue("foreground-on-error-hover-large").withDefault((e=>rr.getValueFor(e).evaluate(e,Xo.getValueFor(e)))),lr=ue("foreground-on-error-active-large").withDefault((e=>rr.getValueFor(e).evaluate(e,Yo.getValueFor(e)))),nr=ue("foreground-on-error-focus-large").withDefault((e=>rr.getValueFor(e).evaluate(e,Zo.getValueFor(e)))),sr=ue({name:"error-foreground-recipe",cssCustomPropertyName:null}).withDefault({evaluate:(e,t)=>(e=>(t,o)=>function(e,t,o,r,a,i,l){const n=e.source,s=e.closestIndexOf(n),c=G(t)?-1:1,d=s+(1===c?Math.min(r,a):Math.max(c*r,c*a)),h=e.colorContrast(t,o,d,c),u=e.closestIndexOf(h),p=u+c*Math.abs(r-a);let g,b;return(1===c?r<a:c*r>c*a)?(g=u,b=p):(g=p,b=u),{rest:e.get(g),hover:e.get(b),active:e.get(g+c*i),focus:e.get(g+c*l)}}(qo.getValueFor(t),o||Ot.getValueFor(t),e,Xe.getValueFor(t),Ye.getValueFor(t),Ze.getValueFor(t),Je.getValueFor(t)))(Rt.normal)(e,t)}),cr=ue("error-foreground-rest").withDefault((e=>sr.getValueFor(e).evaluate(e).rest)),dr=ue("error-foreground-hover").withDefault((e=>sr.getValueFor(e).evaluate(e).hover)),hr=ue("error-foreground-active").withDefault((e=>sr.getValueFor(e).evaluate(e).active)),ur=ue("error-foreground-focus").withDefault((e=>sr.getValueFor(e).evaluate(e).focus)),pr="data-jp-theme-name",gr="data-jp-theme-light",br="--jp-layout-color1";let fr=!1;function mr(){fr||(fr=!0,function(){const e=()=>{new MutationObserver((()=>{xr()})).observe(document.body,{attributes:!0,attributeFilter:[pr],childList:!1,characterData:!1}),xr()};"complete"===document.readyState?e():window.addEventListener("load",e)}())}const vr=e=>{const t=parseInt(e,10);return isNaN(t)?null:t},$r={"--jp-border-width":{converter:vr,token:Fe},"--jp-border-radius":{converter:vr,token:ve},[br]:{converter:(e,t)=>{const o=m(e);if(o){const e=S(o),t=D(v.fromObject({h:e.h,s:e.s,l:.5}));return R.create(t.r,t.g,t.b)}return null},token:xt},"--jp-brand-color1":{converter:(e,t)=>{const o=m(e);if(o){const e=S(o),r=t?1:-1,a=D(v.fromObject({h:e.h,s:e.s,l:e.l+r*qe.getValueFor(document.body)/94}));return R.create(a.r,a.g,a.b)}return null},token:wt},"--jp-error-color1":{converter:(e,t)=>{const o=m(e);if(o){const e=S(o),r=t?1:-1,a=D(v.fromObject({h:e.h,s:e.s,l:e.l+r*qe.getValueFor(document.body)/94}));return R.create(a.r,a.g,a.b)}return null},token:_o},"--jp-ui-font-family":{token:ge},"--jp-ui-font-size1":{token:Ve}};function xr(){var e;const t=getComputedStyle(document.body),o=document.body.getAttribute(gr);let r=!1;if(o)r="false"===o;else{const e=t.getPropertyValue(br).toString();if(e){const t=m(e);t&&(r=G(R.create(t.r,t.g,t.b)),console.debug(`Theme is ${r?"dark":"light"} based on '${br}' value: ${e}.`))}}me.setValueFor(document.body,r?A.DarkMode:A.LightMode);for(const o in $r){const a=$r[o],i=t.getPropertyValue(o).toString();if(document.body&&""!==i){const t=(null!==(e=a.converter)&&void 0!==e?e:e=>e)(i.trim(),r);null!==t?a.token.setValueFor(document.body,t):console.error(`Fail to parse value '${i}' for '${o}' as FAST design token.`)}}}var yr=o(40950);const wr=(e,t)=>yr.css`
  ${(0,q.display)("flex")} :host {
    box-sizing: border-box;
    flex-direction: column;
    font-family: ${ge};
    font-size: ${De};
    line-height: ${Te};
    color: ${Ho};
    border-top: calc(${Fe} * 1px) solid ${Go};
  }
`;var kr;!function(e){e.Canvas="Canvas",e.CanvasText="CanvasText",e.LinkText="LinkText",e.VisitedText="VisitedText",e.ActiveText="ActiveText",e.ButtonFace="ButtonFace",e.ButtonText="ButtonText",e.Field="Field",e.FieldText="FieldText",e.Highlight="Highlight",e.HighlightText="HighlightText",e.GrayText="GrayText"}(kr||(kr={}));const Fr=yr.cssPartial`(${be} + ${$e} + ${ye}) * ${xe}`,Cr=(e,t)=>yr.css`
    ${(0,q.display)("flex")} :host {
      box-sizing: border-box;
      font-family: ${ge};
      flex-direction: column;
      font-size: ${De};
      line-height: ${Te};
      border-bottom: calc(${Fe} * 1px) solid
        ${Go};
    }

    .region {
      display: none;
      padding: calc((6 + (${xe} * 2 * ${$e})) * 1px);
    }

    div.heading {
      display: grid;
      position: relative;
      grid-template-columns: calc(${Fr} * 1px) auto 1fr auto;
      color: ${Ho};
    }

    .button {
      appearance: none;
      border: none;
      background: none;
      grid-column: 3;
      outline: none;
      padding: 0 calc((6 + (${xe} * 2 * ${$e})) * 1px);
      text-align: left;
      height: calc(${Fr} * 1px);
      color: currentcolor;
      cursor: pointer;
      font-family: inherit;
    }

    .button:hover {
      color: currentcolor;
    }

    .button:active {
      color: currentcolor;
    }

    .button::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      cursor: pointer;
    }

    /* prettier-ignore */
    .button:${q.focusVisible}::before {
      outline: none;
      border: calc(${Ce} * 1px) solid ${Gt};
      border-radius: calc(${ve} * 1px);
    }

    :host([expanded]) .region {
      display: block;
    }

    .icon {
      display: flex;
      align-items: center;
      justify-content: center;
      grid-column: 1;
      grid-row: 1;
      pointer-events: none;
      position: relative;
    }

    slot[name='expanded-icon'],
    slot[name='collapsed-icon'] {
      fill: currentcolor;
    }

    slot[name='collapsed-icon'] {
      display: flex;
    }

    :host([expanded]) slot[name='collapsed-icon'] {
      display: none;
    }

    slot[name='expanded-icon'] {
      display: none;
    }

    :host([expanded]) slot[name='expanded-icon'] {
      display: flex;
    }

    .start {
      display: flex;
      align-items: center;
      padding-inline-start: calc(${xe} * 1px);
      justify-content: center;
      grid-column: 2;
      position: relative;
    }

    .end {
      display: flex;
      align-items: center;
      justify-content: center;
      grid-column: 4;
      position: relative;
    }
  `.withBehaviors((0,q.forcedColorsStylesheetBehavior)(yr.css`
      /* prettier-ignore */
      .button:${q.focusVisible}::before {
          border-color: ${kr.Highlight};
        }
      :host slot[name='collapsed-icon'],
      :host([expanded]) slot[name='expanded-icon'] {
        fill: ${kr.ButtonText};
      }
    `));class Vr extends q.AccordionItem{}const Sr=Vr.compose({baseName:"accordion-item",baseClass:q.AccordionItem,template:q.accordionItemTemplate,styles:Cr,collapsedIcon:'\n        <svg\n            width="20"\n            height="20"\n            viewBox="0 0 16 16"\n            xmlns="http://www.w3.org/2000/svg"\n        >\n            <path\n                fill-rule="evenodd"\n                clip-rule="evenodd"\n                d="M5.00001 12.3263C5.00124 12.5147 5.05566 12.699 5.15699 12.8578C5.25831 13.0167 5.40243 13.1437 5.57273 13.2242C5.74304 13.3047 5.9326 13.3354 6.11959 13.3128C6.30659 13.2902 6.4834 13.2152 6.62967 13.0965L10.8988 8.83532C11.0739 8.69473 11.2153 8.51658 11.3124 8.31402C11.4096 8.11146 11.46 7.88966 11.46 7.66499C11.46 7.44033 11.4096 7.21853 11.3124 7.01597C11.2153 6.81341 11.0739 6.63526 10.8988 6.49467L6.62967 2.22347C6.48274 2.10422 6.30501 2.02912 6.11712 2.00691C5.92923 1.9847 5.73889 2.01628 5.56823 2.09799C5.39757 2.17969 5.25358 2.30817 5.153 2.46849C5.05241 2.62882 4.99936 2.8144 5.00001 3.00369V12.3263Z"\n            />\n        </svg>\n    ',expandedIcon:'\n        <svg\n            width="20"\n            height="20"\n            viewBox="0 0 16 16"\n            xmlns="http://www.w3.org/2000/svg"\n        >\n            <path\n                fill-rule="evenodd"\n                clip-rule="evenodd"\n                transform="rotate(90,8,8)"\n          d="M5.00001 12.3263C5.00124 12.5147 5.05566 12.699 5.15699 12.8578C5.25831 13.0167 5.40243 13.1437 5.57273 13.2242C5.74304 13.3047 5.9326 13.3354 6.11959 13.3128C6.30659 13.2902 6.4834 13.2152 6.62967 13.0965L10.8988 8.83532C11.0739 8.69473 11.2153 8.51658 11.3124 8.31402C11.4096 8.11146 11.46 7.88966 11.46 7.66499C11.46 7.44033 11.4096 7.21853 11.3124 7.01597C11.2153 6.81341 11.0739 6.63526 10.8988 6.49467L6.62967 2.22347C6.48274 2.10422 6.30501 2.02912 6.11712 2.00691C5.92923 1.9847 5.73889 2.01628 5.56823 2.09799C5.39757 2.17969 5.25358 2.30817 5.153 2.46849C5.05241 2.62882 4.99936 2.8144 5.00001 3.00369V12.3263Z"\n            />\n        </svg>\n    '});class Dr extends q.Accordion{}const Tr=Dr.compose({baseName:"accordion",baseClass:q.Accordion,template:q.accordionTemplate,styles:wr});function zr(e,t,o,r){var a,i=arguments.length,l=i<3?t:null===r?r=Object.getOwnPropertyDescriptor(t,o):r;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,o,r);else for(var n=e.length-1;n>=0;n--)(a=e[n])&&(l=(i<3?a(l):i>3?a(t,o,l):a(t,o))||l);return i>3&&l&&Object.defineProperty(t,o,l),l}Object.create,Object.create,"function"==typeof SuppressedError&&SuppressedError;const Br=yr.css`
  ${(0,q.display)("inline-flex")} :host {
    font-family: ${ge};
    outline: none;
    font-size: ${Ve};
    line-height: ${Se};
    height: calc(${Fr} * 1px);
    min-width: calc(${Fr} * 1px);
    background-color: ${lo};
    color: ${Ho};
    border-radius: calc(${ve} * 1px);
    fill: currentcolor;
    cursor: pointer;
    margin: calc((${Ce} + 2) * 1px);
  }

  .control {
    background: transparent;
    height: inherit;
    flex-grow: 1;
    box-sizing: border-box;
    display: inline-flex;
    justify-content: center;
    align-items: center;
    padding: 0
      max(
        1px,
        calc((10 + (${xe} * 2 * (${$e} + ${ye})))) * 1px
      );
    white-space: nowrap;
    outline: none;
    text-decoration: none;
    border: calc(${Fe} * 1px) solid transparent;
    color: inherit;
    border-radius: inherit;
    fill: inherit;
    cursor: inherit;
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
  }

  :host(:hover) {
    background-color: ${no};
  }

  :host(:active) {
    background-color: ${so};
  }

  :host([aria-pressed='true']) {
    box-shadow: inset 0px 0px 2px 2px ${Fo};
  }

  :host([minimal]),
  :host([scale='xsmall']) {
    --element-scale: -4;
  }

  :host([scale='small']) {
    --element-scale: -2;
  }

  :host([scale='medium']) {
    --element-scale: 0;
  }

  :host([scale='large']) {
    --element-scale: 2;
  }

  :host([scale='xlarge']) {
    --element-scale: 4;
  }

  /* prettier-ignore */
  .control:${q.focusVisible} {
      outline: calc(${Ce} * 1px) solid ${Co};
      outline-offset: 2px;
      -moz-outline-radius: 0px;
    }

  .control::-moz-focus-inner {
    border: 0;
  }

  .start,
  .end {
    display: flex;
  }

  .control.icon-only {
    padding: 0;
    line-height: 0;
  }

  ::slotted(svg) {
    ${""} width: 16px;
    height: 16px;
    pointer-events: none;
  }

  .start {
    margin-inline-end: 11px;
  }

  .end {
    margin-inline-start: 11px;
  }
`.withBehaviors((0,q.forcedColorsStylesheetBehavior)(yr.css`
    :host .control {
      background-color: ${kr.ButtonFace};
      border-color: ${kr.ButtonText};
      color: ${kr.ButtonText};
      fill: currentColor;
    }

    :host(:hover) .control {
      forced-color-adjust: none;
      background-color: ${kr.Highlight};
      color: ${kr.HighlightText};
    }

    /* prettier-ignore */
    .control:${q.focusVisible} {
          forced-color-adjust: none;
          background-color: ${kr.Highlight};
          outline-color: ${kr.ButtonText};
          color: ${kr.HighlightText};
        }

    .control:hover,
    :host([appearance='outline']) .control:hover {
      border-color: ${kr.ButtonText};
    }

    :host([href]) .control {
      border-color: ${kr.LinkText};
      color: ${kr.LinkText};
    }

    :host([href]) .control:hover,
        :host([href]) .control:${q.focusVisible} {
      forced-color-adjust: none;
      background: ${kr.ButtonFace};
      outline-color: ${kr.LinkText};
      color: ${kr.LinkText};
      fill: currentColor;
    }
  `)),jr=yr.css`
  :host([appearance='accent']) {
    background: ${It};
    color: ${qt};
  }

  :host([appearance='accent']:hover) {
    background: ${At};
    color: ${Wt};
  }

  :host([appearance='accent'][aria-pressed='true']) {
    box-shadow: inset 0px 0px 2px 2px ${ro};
  }

  :host([appearance='accent']:active) .control:active {
    background: ${Mt};
    color: ${Ut};
  }

  :host([appearance="accent"]) .control:${q.focusVisible} {
    outline-color: ${Gt};
  }
`.withBehaviors((0,q.forcedColorsStylesheetBehavior)(yr.css`
    :host([appearance='accent']) .control {
      forced-color-adjust: none;
      background: ${kr.Highlight};
      color: ${kr.HighlightText};
    }

    :host([appearance='accent']) .control:hover,
    :host([appearance='accent']:active) .control:active {
      background: ${kr.HighlightText};
      border-color: ${kr.Highlight};
      color: ${kr.Highlight};
    }

    :host([appearance="accent"]) .control:${q.focusVisible} {
      outline-color: ${kr.Highlight};
    }

    :host([appearance='accent'][href]) .control {
      background: ${kr.LinkText};
      color: ${kr.HighlightText};
    }

    :host([appearance='accent'][href]) .control:hover {
      background: ${kr.ButtonFace};
      border-color: ${kr.LinkText};
      box-shadow: none;
      color: ${kr.LinkText};
      fill: currentColor;
    }

    :host([appearance="accent"][href]) .control:${q.focusVisible} {
      outline-color: ${kr.HighlightText};
    }
  `)),Lr=yr.css`
  :host([appearance='error']) {
    background: ${Uo};
    color: ${qt};
  }

  :host([appearance='error']:hover) {
    background: ${Xo};
    color: ${Wt};
  }

  :host([appearance='error'][aria-pressed='true']) {
    box-shadow: inset 0px 0px 2px 2px ${hr};
  }

  :host([appearance='error']:active) .control:active {
    background: ${Yo};
    color: ${Ut};
  }

  :host([appearance="error"]) .control:${q.focusVisible} {
    outline-color: ${Zo};
  }
`.withBehaviors((0,q.forcedColorsStylesheetBehavior)(yr.css`
    :host([appearance='error']) .control {
      forced-color-adjust: none;
      background: ${kr.Highlight};
      color: ${kr.HighlightText};
    }

    :host([appearance='error']) .control:hover,
    :host([appearance='error']:active) .control:active {
      background: ${kr.HighlightText};
      border-color: ${kr.Highlight};
      color: ${kr.Highlight};
    }

    :host([appearance="error"]) .control:${q.focusVisible} {
      outline-color: ${kr.Highlight};
    }

    :host([appearance='error'][href]) .control {
      background: ${kr.LinkText};
      color: ${kr.HighlightText};
    }

    :host([appearance='error'][href]) .control:hover {
      background: ${kr.ButtonFace};
      border-color: ${kr.LinkText};
      box-shadow: none;
      color: ${kr.LinkText};
      fill: currentColor;
    }

    :host([appearance="error"][href]) .control:${q.focusVisible} {
      outline-color: ${kr.HighlightText};
    }
  `)),Nr=yr.css`
  :host([appearance='hypertext']) {
    font-size: inherit;
    line-height: inherit;
    height: auto;
    min-width: 0;
    background: transparent;
  }

  :host([appearance='hypertext']) .control {
    display: inline;
    padding: 0;
    border: none;
    box-shadow: none;
    border-radius: 0;
    line-height: 1;
  }

  :host a.control:not(:link) {
    background-color: transparent;
    cursor: default;
  }
  :host([appearance='hypertext']) .control:link,
  :host([appearance='hypertext']) .control:visited {
    background: transparent;
    color: ${to};
    border-bottom: calc(${Fe} * 1px) solid ${to};
  }

  :host([appearance='hypertext']:hover),
  :host([appearance='hypertext']) .control:hover {
    background: transparent;
    border-bottom-color: ${oo};
  }

  :host([appearance='hypertext']:active),
  :host([appearance='hypertext']) .control:active {
    background: transparent;
    border-bottom-color: ${ro};
  }

  :host([appearance="hypertext"]) .control:${q.focusVisible} {
    outline-color: transparent;
    border-bottom: calc(${Ce} * 1px) solid ${To};
    margin-bottom: calc(calc(${Fe} - ${Ce}) * 1px);
  }
`.withBehaviors((0,q.forcedColorsStylesheetBehavior)(yr.css`
    :host([appearance='hypertext']:hover) {
      background-color: ${kr.ButtonFace};
      color: ${kr.ButtonText};
    }
    :host([appearance="hypertext"][href]) .control:hover,
        :host([appearance="hypertext"][href]) .control:active,
        :host([appearance="hypertext"][href]) .control:${q.focusVisible} {
      color: ${kr.LinkText};
      border-bottom-color: ${kr.LinkText};
      box-shadow: none;
    }
  `)),Hr=yr.css`
  :host([appearance='lightweight']) {
    background: transparent;
    color: ${to};
  }

  :host([appearance='lightweight']) .control {
    padding: 0;
    height: initial;
    border: none;
    box-shadow: none;
    border-radius: 0;
  }

  :host([appearance='lightweight']:hover) {
    background: transparent;
    color: ${oo};
  }

  :host([appearance='lightweight']:active) {
    background: transparent;
    color: ${ro};
  }

  :host([appearance='lightweight']) .content {
    position: relative;
  }

  :host([appearance='lightweight']) .content::before {
    content: '';
    display: block;
    height: calc(${Fe} * 1px);
    position: absolute;
    top: calc(1em + 4px);
    width: 100%;
  }

  :host([appearance='lightweight']:hover) .content::before {
    background: ${oo};
  }

  :host([appearance='lightweight']:active) .content::before {
    background: ${ro};
  }

  :host([appearance="lightweight"]) .control:${q.focusVisible} {
    outline-color: transparent;
  }

  :host([appearance="lightweight"]) .control:${q.focusVisible} .content::before {
    background: ${Ho};
    height: calc(${Ce} * 1px);
  }
`.withBehaviors((0,q.forcedColorsStylesheetBehavior)(yr.css`
    :host([appearance="lightweight"]) .control:hover,
        :host([appearance="lightweight"]) .control:${q.focusVisible} {
      forced-color-adjust: none;
      background: ${kr.ButtonFace};
      color: ${kr.Highlight};
    }
    :host([appearance="lightweight"]) .control:hover .content::before,
        :host([appearance="lightweight"]) .control:${q.focusVisible} .content::before {
      background: ${kr.Highlight};
    }

    :host([appearance="lightweight"][href]) .control:hover,
        :host([appearance="lightweight"][href]) .control:${q.focusVisible} {
      background: ${kr.ButtonFace};
      box-shadow: none;
      color: ${kr.LinkText};
    }

    :host([appearance="lightweight"][href]) .control:hover .content::before,
        :host([appearance="lightweight"][href]) .control:${q.focusVisible} .content::before {
      background: ${kr.LinkText};
    }
  `)),Or=yr.css`
  :host([appearance='outline']) {
    background: transparent;
    border-color: ${It};
  }

  :host([appearance='outline']:hover) {
    border-color: ${At};
  }

  :host([appearance='outline']:active) {
    border-color: ${Mt};
  }

  :host([appearance='outline']) .control {
    border-color: inherit;
  }

  :host([appearance="outline"]) .control:${q.focusVisible} {
    outline-color: ${Gt};
  }
`.withBehaviors((0,q.forcedColorsStylesheetBehavior)(yr.css`
    :host([appearance='outline']) .control {
      border-color: ${kr.ButtonText};
    }
    :host([appearance="outline"]) .control:${q.focusVisible} {
      forced-color-adjust: none;
      background-color: ${kr.Highlight};
      outline-color: ${kr.ButtonText};
      color: ${kr.HighlightText};
      fill: currentColor;
    }
    :host([appearance='outline'][href]) .control {
      background: ${kr.ButtonFace};
      border-color: ${kr.LinkText};
      color: ${kr.LinkText};
      fill: currentColor;
    }
    :host([appearance="outline"][href]) .control:hover,
        :host([appearance="outline"][href]) .control:${q.focusVisible} {
      forced-color-adjust: none;
      outline-color: ${kr.LinkText};
    }
  `)),Rr=yr.css`
  :host([appearance='stealth']),
  :host([appearance='stealth'][disabled]:active),
  :host([appearance='stealth'][disabled]:hover) {
    background: transparent;
  }

  :host([appearance='stealth']:hover) {
    background: ${vo};
  }

  :host([appearance='stealth']:active) {
    background: ${$o};
  }

  :host([appearance='stealth']) .control:${q.focusVisible} {
    outline-color: ${Gt};
  }

  /* Make the focus outline displayed within the button if
     it is in a start or end slot; e.g. in a tree item
     This will make the focus outline bounded within the container.
   */
  :host([appearance='stealth'][slot="end"]) .control:${q.focusVisible},
  :host([appearance='stealth'][slot="start"]) .control:${q.focusVisible} {
    outline-offset: -2px;
  }
`.withBehaviors((0,q.forcedColorsStylesheetBehavior)(yr.css`
    :host([appearance='stealth']),
    :host([appearance='stealth']) .control {
      forced-color-adjust: none;
      background: ${kr.ButtonFace};
      border-color: transparent;
      color: ${kr.ButtonText};
      fill: currentColor;
    }

    :host([appearance='stealth']:hover) .control {
      background: ${kr.Highlight};
      border-color: ${kr.Highlight};
      color: ${kr.HighlightText};
      fill: currentColor;
    }

    :host([appearance="stealth"]:${q.focusVisible}) .control {
      outline-color: ${kr.Highlight};
      color: ${kr.HighlightText};
      fill: currentColor;
    }

    :host([appearance='stealth'][href]) .control {
      color: ${kr.LinkText};
    }

    :host([appearance="stealth"][href]:hover) .control,
        :host([appearance="stealth"][href]:${q.focusVisible}) .control {
      background: ${kr.LinkText};
      border-color: ${kr.LinkText};
      color: ${kr.HighlightText};
      fill: currentColor;
    }

    :host([appearance="stealth"][href]:${q.focusVisible}) .control {
      forced-color-adjust: none;
      box-shadow: 0 0 0 1px ${kr.LinkText};
    }
  `));function Pr(e,t){return new q.PropertyStyleSheetBehavior("appearance",e,t)}const Ir=(e,t)=>yr.css`
    ${Br}
  `.withBehaviors(Pr("accent",jr),Pr("hypertext",Nr),Pr("lightweight",Hr),Pr("outline",Or),Pr("stealth",Rr));class Ar extends q.Anchor{appearanceChanged(e,t){this.$fastController.isConnected&&(this.classList.remove(e),this.classList.add(t))}connectedCallback(){super.connectedCallback(),this.appearance||(this.appearance="neutral")}defaultSlottedContentChanged(e,t){const o=this.defaultSlottedContent.filter((e=>e.nodeType===Node.ELEMENT_NODE));1===o.length&&o[0]instanceof SVGElement?this.control.classList.add("icon-only"):this.control.classList.remove("icon-only")}}zr([yr.attr],Ar.prototype,"appearance",void 0);const Mr=Ar.compose({baseName:"anchor",baseClass:q.Anchor,template:q.anchorTemplate,styles:Ir,shadowOptions:{delegatesFocus:!0}}),Gr=(e,t)=>yr.css`
  :host {
    contain: layout;
    display: block;
  }
`;class Er extends q.AnchoredRegion{}const _r=Er.compose({baseName:"anchored-region",baseClass:q.AnchoredRegion,template:q.anchoredRegionTemplate,styles:Gr});class qr{constructor(e,t){this.cache=new WeakMap,this.ltr=e,this.rtl=t}bind(e){this.attach(e)}unbind(e){const t=this.cache.get(e);t&&we.unsubscribe(t)}attach(e){const t=this.cache.get(e)||new Wr(this.ltr,this.rtl,e),o=we.getValueFor(e);we.subscribe(t),t.attach(o),this.cache.set(e,t)}}class Wr{constructor(e,t,o){this.ltr=e,this.rtl=t,this.source=o,this.attached=null}handleChange({target:e,token:t}){this.attach(t.getValueFor(e))}attach(e){this.attached!==this[e]&&(null!==this.attached&&this.source.$fastController.removeStyles(this.attached),this.attached=this[e],null!==this.attached&&this.source.$fastController.addStyles(this.attached))}}const Ur=(e,t)=>yr.css`
    ${(0,q.display)("flex")} :host {
      position: relative;
      height: var(--avatar-size, var(--avatar-size-default));
      width: var(--avatar-size, var(--avatar-size-default));
      --avatar-size-default: calc(
        (
            (${be} + ${$e}) * ${xe} +
              ((${xe} * 8) - 40)
          ) * 1px
      );
      --avatar-text-size: ${Ve};
      --avatar-text-ratio: ${xe};
    }

    .link {
      text-decoration: none;
      color: ${Ho};
      display: flex;
      flex-direction: row;
      justify-content: center;
      align-items: center;
      min-width: 100%;
    }

    .square {
      border-radius: calc(${ve} * 1px);
      min-width: 100%;
      overflow: hidden;
    }

    .circle {
      border-radius: 100%;
      min-width: 100%;
      overflow: hidden;
    }

    .backplate {
      position: relative;
      display: flex;
      background-color: ${It};
    }

    .media,
    ::slotted(img) {
      max-width: 100%;
      position: absolute;
      display: block;
    }

    .content {
      font-size: calc(
        (
            var(--avatar-text-size) +
              var(--avatar-size, var(--avatar-size-default))
          ) / var(--avatar-text-ratio)
      );
      line-height: var(--avatar-size, var(--avatar-size-default));
      display: block;
      min-height: var(--avatar-size, var(--avatar-size-default));
    }

    ::slotted(${e.tagFor(q.Badge)}) {
      position: absolute;
      display: block;
    }
  `.withBehaviors(new qr(((e,t)=>yr.css`
  ::slotted(${e.tagFor(q.Badge)}) {
    right: 0;
  }
`)(e),((e,t)=>yr.css`
  ::slotted(${e.tagFor(q.Badge)}) {
    left: 0;
  }
`)(e)));class Xr extends q.Avatar{}zr([(0,yr.attr)({attribute:"src"})],Xr.prototype,"imgSrc",void 0),zr([yr.attr],Xr.prototype,"alt",void 0);const Yr=yr.html`
  ${(0,yr.when)((e=>e.imgSrc),yr.html`
      <img
        src="${e=>e.imgSrc}"
        alt="${e=>e.alt}"
        slot="media"
        class="media"
        part="media"
      />
    `)}
`,Zr=Xr.compose({baseName:"avatar",baseClass:q.Avatar,template:q.avatarTemplate,styles:Ur,media:Yr,shadowOptions:{delegatesFocus:!0}}),Jr=(e,t)=>yr.css`
  ${(0,q.display)("inline-block")} :host {
    box-sizing: border-box;
    font-family: ${ge};
    font-size: ${De};
    line-height: ${Te};
  }

  .control {
    border-radius: calc(${ve} * 1px);
    padding: calc(((${xe} * 0.5) - ${Fe}) * 1px)
      calc((${xe} - ${Fe}) * 1px);
    color: ${Ho};
    font-weight: 600;
    border: calc(${Fe} * 1px) solid transparent;
    background-color: ${lo};
  }

  .control[style] {
    font-weight: 400;
  }

  :host([circular]) .control {
    border-radius: 100px;
    padding: 0 calc(${xe} * 1px);
    height: calc((${Fr} - (${xe} * 3)) * 1px);
    min-width: calc((${Fr} - (${xe} * 3)) * 1px);
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
  }
`;class Kr extends q.Badge{}const Qr=Kr.compose({baseName:"badge",baseClass:q.Badge,template:q.badgeTemplate,styles:Jr}),ea=(e,t)=>yr.css`
  ${(0,q.display)("inline-block")} :host {
    box-sizing: border-box;
    font-family: ${ge};
    font-size: ${Ve};
    line-height: ${Se};
  }

  .list {
    display: flex;
    flex-wrap: wrap;
  }
`;class ta extends q.Breadcrumb{}const oa=ta.compose({baseName:"breadcrumb",baseClass:q.Breadcrumb,template:q.breadcrumbTemplate,styles:ea}),ra=(e,t)=>yr.css`
    ${(0,q.display)("inline-flex")} :host {
        background: transparent;
        box-sizing: border-box;
        font-family: ${ge};
        font-size: ${Ve};
        fill: currentColor;
        line-height: ${Se};
        min-width: calc(${Fr} * 1px);
        outline: none;
        color: ${Ho}
    }

    .listitem {
        display: flex;
        align-items: center;
        width: max-content;
    }

    .separator {
        margin: 0 6px;
        display: flex;
    }

    .control {
        align-items: center;
        box-sizing: border-box;
        color: ${to};
        cursor: pointer;
        display: flex;
        fill: inherit;
        outline: none;
        text-decoration: none;
        white-space: nowrap;
    }

    .control:hover {
        color: ${oo};
    }

    .control:active {
        color: ${ro};
    }

    .control .content {
        position: relative;
    }

    .control .content::before {
        content: "";
        display: block;
        height: calc(${Fe} * 1px);
        left: 0;
        position: absolute;
        right: 0;
        top: calc(1em + 4px);
        width: 100%;
    }

    .control:hover .content::before {
        background: ${oo};
    }

    .control:active .content::before {
        background: ${ro};
    }

    .control:${q.focusVisible} .content::before {
        background: ${ao};
        height: calc(${Ce} * 1px);
    }

    .control:not([href]) {
        color: ${Ho};
        cursor: default;
    }

    .control:not([href]) .content::before {
        background: none;
    }

    .start,
    .end {
        display: flex;
    }

    ::slotted(svg) {
        /* TODO: adaptive typography https://github.com/microsoft/fast/issues/2432 */
        width: 16px;
        height: 16px;
    }

    .start {
        margin-inline-end: 6px;
    }

    .end {
        margin-inline-start: 6px;
    }
`.withBehaviors((0,q.forcedColorsStylesheetBehavior)(yr.css`
      .control:hover .content::before,
                .control:${q.focusVisible} .content::before {
        background: ${kr.LinkText};
      }
      .start,
      .end {
        fill: ${kr.ButtonText};
      }
    `));class aa extends q.BreadcrumbItem{}const ia=aa.compose({baseName:"breadcrumb-item",baseClass:q.BreadcrumbItem,template:q.breadcrumbItemTemplate,styles:ra,separator:"/",shadowOptions:{delegatesFocus:!0}}),la=(e,t)=>yr.css`
    :host([disabled]),
    :host([disabled]:hover),
    :host([disabled]:active) {
      opacity: ${ke};
      background-color: ${lo};
      cursor: ${q.disabledCursor};
    }

    ${Br}
  `.withBehaviors((0,q.forcedColorsStylesheetBehavior)(yr.css`
      :host([disabled]),
      :host([disabled]) .control,
      :host([disabled]:hover),
      :host([disabled]:active) {
        forced-color-adjust: none;
        background-color: ${kr.ButtonFace};
        outline-color: ${kr.GrayText};
        color: ${kr.GrayText};
        cursor: ${q.disabledCursor};
        opacity: 1;
      }
    `),Pr("accent",yr.css`
        :host([appearance='accent'][disabled]),
        :host([appearance='accent'][disabled]:hover),
        :host([appearance='accent'][disabled]:active) {
          background: ${It};
        }

        ${jr}
      `.withBehaviors((0,q.forcedColorsStylesheetBehavior)(yr.css`
          :host([appearance='accent'][disabled]) .control,
          :host([appearance='accent'][disabled]) .control:hover {
            background: ${kr.ButtonFace};
            border-color: ${kr.GrayText};
            color: ${kr.GrayText};
          }
        `))),Pr("error",yr.css`
        :host([appearance='error'][disabled]),
        :host([appearance='error'][disabled]:hover),
        :host([appearance='error'][disabled]:active) {
          background: ${Uo};
        }

        ${Lr}
      `.withBehaviors((0,q.forcedColorsStylesheetBehavior)(yr.css`
          :host([appearance='error'][disabled]) .control,
          :host([appearance='error'][disabled]) .control:hover {
            background: ${kr.ButtonFace};
            border-color: ${kr.GrayText};
            color: ${kr.GrayText};
          }
        `))),Pr("lightweight",yr.css`
        :host([appearance='lightweight'][disabled]:hover),
        :host([appearance='lightweight'][disabled]:active) {
          background-color: transparent;
          color: ${to};
        }

        :host([appearance='lightweight'][disabled]) .content::before,
        :host([appearance='lightweight'][disabled]:hover) .content::before,
        :host([appearance='lightweight'][disabled]:active) .content::before {
          background: transparent;
        }

        ${Hr}
      `.withBehaviors((0,q.forcedColorsStylesheetBehavior)(yr.css`
          :host([appearance='lightweight'].disabled) .control {
            forced-color-adjust: none;
            color: ${kr.GrayText};
          }

          :host([appearance='lightweight'].disabled)
            .control:hover
            .content::before {
            background: none;
          }
        `))),Pr("outline",yr.css`
        :host([appearance='outline'][disabled]),
        :host([appearance='outline'][disabled]:hover),
        :host([appearance='outline'][disabled]:active) {
          background: transparent;
          border-color: ${It};
        }

        ${Or}
      `.withBehaviors((0,q.forcedColorsStylesheetBehavior)(yr.css`
          :host([appearance='outline'][disabled]) .control {
            border-color: ${kr.GrayText};
          }
        `))),Pr("stealth",yr.css`
        ${Rr}
      `.withBehaviors((0,q.forcedColorsStylesheetBehavior)(yr.css`
          :host([appearance='stealth'][disabled]) {
            background: ${kr.ButtonFace};
          }

          :host([appearance='stealth'][disabled]) .control {
            background: ${kr.ButtonFace};
            border-color: transparent;
            color: ${kr.GrayText};
          }
        `))));class na extends q.Button{constructor(){super(...arguments),this.appearance="neutral"}defaultSlottedContentChanged(e,t){const o=this.defaultSlottedContent.filter((e=>e.nodeType===Node.ELEMENT_NODE));1===o.length&&(o[0]instanceof SVGElement||o[0].classList.contains("fa")||o[0].classList.contains("fas"))?this.control.classList.add("icon-only"):this.control.classList.remove("icon-only")}}zr([yr.attr],na.prototype,"appearance",void 0),zr([(0,yr.attr)({attribute:"minimal",mode:"boolean"})],na.prototype,"minimal",void 0),zr([yr.attr],na.prototype,"scale",void 0);const sa=na.compose({baseName:"button",baseClass:q.Button,template:q.buttonTemplate,styles:la,shadowOptions:{delegatesFocus:!0}}),ca="box-shadow: 0 0 calc((var(--elevation) * 0.225px) + 2px) rgba(0, 0, 0, calc(.11 * (2 - var(--background-luminance, 1)))), 0 calc(var(--elevation) * 0.4px) calc((var(--elevation) * 0.9px)) rgba(0, 0, 0, calc(.13 * (2 - var(--background-luminance, 1))));",da=(e,t)=>yr.css`
    ${(0,q.display)("block")} :host {
      --elevation: 4;
      display: block;
      contain: content;
      height: var(--card-height, 100%);
      width: var(--card-width, 100%);
      box-sizing: border-box;
      background: ${Ot};
      border-radius: calc(${ve} * 1px);
      ${ca}
    }
  `.withBehaviors((0,q.forcedColorsStylesheetBehavior)(yr.css`
      :host {
        forced-color-adjust: none;
        background: ${kr.Canvas};
        box-shadow: 0 0 0 1px ${kr.CanvasText};
      }
    `));class ha extends q.Card{connectedCallback(){super.connectedCallback();const e=(0,q.composedParent)(this);e&&Ot.setValueFor(this,(t=>Vo.getValueFor(t).evaluate(t,Ot.getValueFor(e))))}}const ua=ha.compose({baseName:"card",baseClass:q.Card,template:q.cardTemplate,styles:da}),pa=(e,t)=>yr.css`
    ${(0,q.display)("inline-flex")} :host {
      align-items: center;
      outline: none;
      margin: calc(${xe} * 1px) 0;
      /* Chromium likes to select label text or the default slot when the checkbox is
            clicked. Maybe there is a better solution here? */
      user-select: none;
    }

    .control {
      position: relative;
      width: calc((${Fr} / 2 + ${xe}) * 1px);
      height: calc((${Fr} / 2 + ${xe}) * 1px);
      box-sizing: border-box;
      border-radius: calc(${ve} * 1px);
      border: calc(${Fe} * 1px) solid ${Ro};
      background: ${uo};
      outline: none;
      cursor: pointer;
    }

    :host([aria-invalid='true']) .control {
      border-color: ${Uo};
    }

    .label {
      font-family: ${ge};
      color: ${Ho};
      /* Need to discuss with Brian how HorizontalSpacingNumber can work.
            https://github.com/microsoft/fast/issues/2766 */
      padding-inline-start: calc(${xe} * 2px + 2px);
      margin-inline-end: calc(${xe} * 2px + 2px);
      cursor: pointer;
      font-size: ${Ve};
      line-height: ${Se};
    }

    .label__hidden {
      display: none;
      visibility: hidden;
    }

    .checked-indicator {
      width: 100%;
      height: 100%;
      display: block;
      fill: ${qt};
      opacity: 0;
      pointer-events: none;
    }

    .indeterminate-indicator {
      border-radius: calc(${ve} * 1px);
      background: ${qt};
      position: absolute;
      top: 50%;
      left: 50%;
      width: 50%;
      height: 50%;
      transform: translate(-50%, -50%);
      opacity: 0;
    }

    :host(:not([disabled])) .control:hover {
      background: ${po};
      border-color: ${Po};
    }

    :host(:not([disabled])) .control:active {
      background: ${go};
      border-color: ${Io};
    }

    :host([aria-invalid='true']:not([disabled])) .control:hover {
      border-color: ${Xo};
    }

    :host([aria-invalid='true']:not([disabled])) .control:active {
      border-color: ${Yo};
    }

    :host(:${q.focusVisible}) .control {
      outline: calc(${Ce} * 1px) solid ${Gt};
      outline-offset: 2px;
    }

    :host([aria-invalid='true']:${q.focusVisible}) .control {
      outline-color: ${Zo};
    }

    :host([aria-checked='true']) .control {
      background: ${It};
      border: calc(${Fe} * 1px) solid ${It};
    }

    :host([aria-checked='true']:not([disabled])) .control:hover {
      background: ${At};
      border: calc(${Fe} * 1px) solid ${At};
    }

    :host([aria-invalid='true'][aria-checked='true']) .control {
      background-color: ${Uo};
      border-color: ${Uo};
    }

    :host([aria-invalid='true'][aria-checked='true']:not([disabled]))
      .control:hover {
      background-color: ${Xo};
      border-color: ${Xo};
    }

    :host([aria-checked='true']:not([disabled]))
      .control:hover
      .checked-indicator {
      fill: ${Wt};
    }

    :host([aria-checked='true']:not([disabled]))
      .control:hover
      .indeterminate-indicator {
      background: ${Wt};
    }

    :host([aria-checked='true']:not([disabled])) .control:active {
      background: ${Mt};
      border: calc(${Fe} * 1px) solid ${Mt};
    }

    :host([aria-invalid='true'][aria-checked='true']:not([disabled]))
      .control:active {
      background-color: ${Yo};
      border-color: ${Yo};
    }

    :host([aria-checked='true']:not([disabled]))
      .control:active
      .checked-indicator {
      fill: ${Ut};
    }

    :host([aria-checked='true']:not([disabled]))
      .control:active
      .indeterminate-indicator {
      background: ${Ut};
    }

    :host([aria-checked="true"]:${q.focusVisible}:not([disabled])) .control {
      outline: calc(${Ce} * 1px) solid ${Gt};
      outline-offset: 2px;
    }

    :host([aria-invalid='true'][aria-checked="true"]:${q.focusVisible}:not([disabled])) .control {
      outline-color: ${Zo};
    }

    :host([disabled]) .label,
    :host([readonly]) .label,
    :host([readonly]) .control,
    :host([disabled]) .control {
      cursor: ${q.disabledCursor};
    }

    :host([aria-checked='true']:not(.indeterminate)) .checked-indicator,
    :host(.indeterminate) .indeterminate-indicator {
      opacity: 1;
    }

    :host([disabled]) {
      opacity: ${ke};
    }
  `.withBehaviors((0,q.forcedColorsStylesheetBehavior)(yr.css`
      .control {
        forced-color-adjust: none;
        border-color: ${kr.FieldText};
        background: ${kr.Field};
      }
      :host([aria-invalid='true']) .control {
        border-style: dashed;
      }
      .checked-indicator {
        fill: ${kr.FieldText};
      }
      .indeterminate-indicator {
        background: ${kr.FieldText};
      }
      :host(:not([disabled])) .control:hover,
      .control:active {
        border-color: ${kr.Highlight};
        background: ${kr.Field};
      }
      :host(:${q.focusVisible}) .control {
        outline: calc(${Ce} * 1px) solid ${kr.FieldText};
        outline-offset: 2px;
      }
      :host([aria-checked="true"]:${q.focusVisible}:not([disabled])) .control {
        outline: calc(${Ce} * 1px) solid ${kr.FieldText};
        outline-offset: 2px;
      }
      :host([aria-checked='true']) .control {
        background: ${kr.Highlight};
        border-color: ${kr.Highlight};
      }
      :host([aria-checked='true']:not([disabled])) .control:hover,
      .control:active {
        border-color: ${kr.Highlight};
        background: ${kr.HighlightText};
      }
      :host([aria-checked='true']) .checked-indicator {
        fill: ${kr.HighlightText};
      }
      :host([aria-checked='true']:not([disabled]))
        .control:hover
        .checked-indicator {
        fill: ${kr.Highlight};
      }
      :host([aria-checked='true']) .indeterminate-indicator {
        background: ${kr.HighlightText};
      }
      :host([aria-checked='true']) .control:hover .indeterminate-indicator {
        background: ${kr.Highlight};
      }
      :host([disabled]) {
        opacity: 1;
      }
      :host([disabled]) .control {
        forced-color-adjust: none;
        border-color: ${kr.GrayText};
        background: ${kr.Field};
      }
      :host([disabled]) .indeterminate-indicator,
      :host([aria-checked='true'][disabled])
        .control:hover
        .indeterminate-indicator {
        forced-color-adjust: none;
        background: ${kr.GrayText};
      }
      :host([disabled]) .checked-indicator,
      :host([aria-checked='true'][disabled]) .control:hover .checked-indicator {
        forced-color-adjust: none;
        fill: ${kr.GrayText};
      }
    `)),ga=(e,t)=>yr.html`
  <template
    role="checkbox"
    aria-checked="${e=>e.checked}"
    aria-required="${e=>e.required}"
    aria-disabled="${e=>e.disabled}"
    aria-readonly="${e=>e.readOnly}"
    tabindex="${e=>e.disabled?null:0}"
    @keypress="${(e,t)=>e.keypressHandler(t.event)}"
    @click="${(e,t)=>e.clickHandler(t.event)}"
  >
    <div part="control" class="control">
      <slot name="checked-indicator">
        ${t.checkedIndicator||""}
      </slot>
      <slot name="indeterminate-indicator">
        ${t.indeterminateIndicator||""}
      </slot>
    </div>
    <label
      part="label"
      class="${e=>e.defaultSlottedNodes&&e.defaultSlottedNodes.length?"label":"label label__hidden"}"
    >
      <slot ${(0,yr.slotted)("defaultSlottedNodes")}></slot>
    </label>
  </template>
`;class ba extends q.Checkbox{indeterminateChanged(e,t){this.indeterminate?this.classList.add("indeterminate"):this.classList.remove("indeterminate")}}const fa=ba.compose({baseName:"checkbox",baseClass:q.Checkbox,template:ga,styles:pa,checkedIndicator:'\n        <svg\n            part="checked-indicator"\n            class="checked-indicator"\n            viewBox="0 0 20 20"\n            xmlns="http://www.w3.org/2000/svg"\n        >\n            <path\n                fill-rule="evenodd"\n                clip-rule="evenodd"\n                d="M8.143 12.6697L15.235 4.5L16.8 5.90363L8.23812 15.7667L3.80005 11.2556L5.27591 9.7555L8.143 12.6697Z"\n            />\n        </svg>\n    ',indeterminateIndicator:'\n        <div part="indeterminate-indicator" class="indeterminate-indicator"></div>\n    '}),ma=(e,t)=>{const o=e.tagFor(q.ListboxOption),r=e.name===e.tagFor(q.ListboxElement)?"":".listbox";return yr.css`
        ${r?"":(0,q.display)("inline-flex")}

        :host ${r} {
            background: ${Ot};
            border: calc(${Fe} * 1px) solid ${Ro};
            border-radius: calc(${ve} * 1px);
            box-sizing: border-box;
            flex-direction: column;
            padding: calc(${xe} * 1px) 0;
        }

        ${r?"":yr.css`
:host(:${q.focusVisible}:not([disabled])) {
                outline: none;
            }

            :host(:focus-within:not([disabled])) {
                border-color: ${To};
                box-shadow: 0 0 0
                    calc((${Ce} - ${Fe}) * 1px)
                    ${To} inset;
            }

            :host([disabled]) ::slotted(*) {
                cursor: ${q.disabledCursor};
                opacity: ${ke};
                pointer-events: none;
            }
        `}

        ${r||":host([size])"} {
            max-height: calc(
                (var(--size) * ${Fr} + (${xe} * ${Fe} * 2)) * 1px
            );
            overflow-y: auto;
        }

        :host([size="0"]) ${r} {
            max-height: none;
        }
    `.withBehaviors((0,q.forcedColorsStylesheetBehavior)(yr.css`
                :host(:not([multiple]):${q.focusVisible}) ::slotted(${o}[aria-selected="true"]),
                :host([multiple]:${q.focusVisible}) ::slotted(${o}[aria-checked="true"]) {
                    border-color: ${kr.ButtonText};
                    box-shadow: 0 0 0 calc(${Ce} * 1px) inset ${kr.HighlightText};
                }

                :host(:not([multiple]):${q.focusVisible}) ::slotted(${o}[aria-selected="true"]) {
                    background: ${kr.Highlight};
                    color: ${kr.HighlightText};
                    fill: currentcolor;
                }

                ::slotted(${o}[aria-selected="true"]:not([aria-checked="true"])) {
                    background: ${kr.Highlight};
                    border-color: ${kr.HighlightText};
                    color: ${kr.HighlightText};
                }
            `))},va=(e,t)=>{const o=e.name===e.tagFor(q.Select);return yr.css`
  ${(0,q.display)("inline-flex")}
  
  :host {
    --elevation: 14;
    background: ${uo};
    border-radius: calc(${ve} * 1px);
    border: calc(${Fe} * 1px) solid ${wo};
    box-sizing: border-box;
    color: ${Ho};
    font-family: ${ge};
    height: calc(${Fr} * 1px);
    position: relative;
    user-select: none;
    min-width: 250px;
    outline: none;
    vertical-align: top;
  }

  :host([aria-invalid='true']) {
    border-color: ${Uo};
  }
  
  :host(:not([autowidth])) {
    min-width: 250px;
  }
  
  ${o?yr.css`
  :host(:not([aria-haspopup])) {
    --elevation: 0;
    border: 0;
    height: auto;
    min-width: 0;
  }
  `:""}
  
  ${ma(e,t)}
  
  :host .listbox {
    ${ca}
    border: none;
    display: flex;
    left: 0;
    position: absolute;
    width: 100%;
    z-index: 1;
  }
  
  .control + .listbox {
    --stroke-size: calc(${xe} * ${Fe} * 2);
    max-height: calc(
      (var(--listbox-max-height) * ${Fr} + var(--stroke-size)) * 1px
      );
  }
  
  ${o?yr.css`
  :host(:not([aria-haspopup])) .listbox {
    left: auto;
    position: static;
    z-index: auto;
  }
  `:""}
  
  :host(:not([autowidth])) .listbox {
    width: 100%;
  }
  
  :host([autowidth]) ::slotted([role='option']),
  :host([autowidth]) ::slotted(option) {
    padding: 0 calc(1em + ${xe} * 1.25px + 1px);
  }
  
  .listbox[hidden] {
    display: none;
  }
  
  .control {
    align-items: center;
    box-sizing: border-box;
    cursor: pointer;
    display: flex;
    font-size: ${Ve};
    font-family: inherit;
    line-height: ${Se};
    min-height: 100%;
    padding: 0 calc(${xe} * 2.25px);
    width: 100%;
  }

  :host([minimal]),
  :host([scale='xsmall']) {
    --element-scale: -4;
  }

  :host([scale='small']) {
    --element-scale: -2;
  }

  :host([scale='medium']) {
    --element-scale: 0;
  }

  :host([scale='large']) {
    --element-scale: 2;
  }

  :host([scale='xlarge']) {
    --element-scale: 4;
  }
  
  :host(:not([disabled]):hover) {
    background: ${po};
    border-color: ${ko};
  }
  
  :host([aria-invalid='true']:not([disabled]):hover) {
    border-color: ${Xo};
  }
  
  :host(:${q.focusVisible}) {
    border-color: ${Gt};
    box-shadow: 0 0 0 calc((${Ce} - ${Fe}) * 1px)
    ${Gt};
  }
  
  :host([aria-invalid='true']:${q.focusVisible}) {
    border-color: ${Zo};
    box-shadow: 0 0 0 calc((${Ce} - ${Fe}) * 1px)
    ${Zo};
  }
  
  :host(:not([size]):not([multiple]):not([open]):${q.focusVisible}),
  :host([multiple]:${q.focusVisible}),
  :host([size]:${q.focusVisible}) {
    box-shadow: 0 0 0 calc((${Ce} - ${Fe}) * 1px)
    ${Gt};
  }
  
  :host([aria-invalid='true']:not([size]):not([multiple]):not([open]):${q.focusVisible}),
  :host([aria-invalid='true'][multiple]:${q.focusVisible}),
  :host([aria-invalid='true'][size]:${q.focusVisible}) {
    box-shadow: 0 0 0 calc((${Ce} - ${Fe}) * 1px)
    ${Zo};
  }
  
  :host(:not([multiple]):not([size]):${q.focusVisible}) ::slotted(${e.tagFor(q.ListboxOption)}[aria-selected="true"]:not([disabled])) {
    box-shadow: 0 0 0 calc(${Ce} * 1px) inset ${Gt};
    border-color: ${Gt};
    background: ${Gt};
    color: ${Xt};
  }
    
  :host([disabled]) {
    cursor: ${q.disabledCursor};
    opacity: ${ke};
  }
  
  :host([disabled]) .control {
    cursor: ${q.disabledCursor};
    user-select: none;
  }
  
  :host([disabled]:hover) {
    background: ${mo};
    color: ${Ho};
    fill: currentcolor;
  }
  
  :host(:not([disabled])) .control:active {
    background: ${go};
    border-color: ${Mt};
    border-radius: calc(${ve} * 1px);
  }
  
  :host([open][position="above"]) .listbox {
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    border-bottom: 0;
    bottom: calc(${Fr} * 1px);
  }
  
  :host([open][position="below"]) .listbox {
    border-top-left-radius: 0;
    border-top-right-radius: 0;
    border-top: 0;
    top: calc(${Fr} * 1px);
  }
  
  .selected-value {
    flex: 1 1 auto;
    font-family: inherit;
    overflow: hidden;
    text-align: start;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .indicator {
    flex: 0 0 auto;
    margin-inline-start: 1em;
  }
  
  slot[name="listbox"] {
    display: none;
    width: 100%;
  }
  
  :host([open]) slot[name="listbox"] {
    display: flex;
    position: absolute;
    ${ca}
  }
  
  .end {
    margin-inline-start: auto;
  }
  
  .start,
  .end,
  .indicator,
  .select-indicator,
  ::slotted(svg) {
    /* TODO: adaptive typography https://github.com/microsoft/fast/issues/2432 */
    fill: currentcolor;
    height: 1em;
    min-height: calc(${xe} * 4px);
    min-width: calc(${xe} * 4px);
    width: 1em;
  }
  
  ::slotted([role="option"]),
  ::slotted(option) {
    flex: 0 0 auto;
  }
  `.withBehaviors((0,q.forcedColorsStylesheetBehavior)(yr.css`
      :host(:not([disabled]):hover),
      :host(:not([disabled]):active) {
        border-color: ${kr.Highlight};
      }

      :host([aria-invalid='true']) {
        border-style: dashed;
      }
      
      :host(:not([disabled]):${q.focusVisible}) {
        background-color: ${kr.ButtonFace};
        box-shadow: 0 0 0 calc(${Ce} * 1px) ${kr.Highlight};
        color: ${kr.ButtonText};
        fill: currentcolor;
        forced-color-adjust: none;
      }
      
      :host(:not([disabled]):${q.focusVisible}) .listbox {
        background: ${kr.ButtonFace};
      }
      
      :host([disabled]) {
        border-color: ${kr.GrayText};
        background-color: ${kr.ButtonFace};
        color: ${kr.GrayText};
        fill: currentcolor;
        opacity: 1;
        forced-color-adjust: none;
      }
      
      :host([disabled]:hover) {
        background: ${kr.ButtonFace};
      }
      
      :host([disabled]) .control {
        color: ${kr.GrayText};
        border-color: ${kr.GrayText};
      }
      
      :host([disabled]) .control .select-indicator {
        fill: ${kr.GrayText};
      }
      
      :host(:${q.focusVisible}) ::slotted([aria-selected="true"][role="option"]),
      :host(:${q.focusVisible}) ::slotted(option[aria-selected="true"]),
      :host(:${q.focusVisible}) ::slotted([aria-selected="true"][role="option"]:not([disabled])) {
        background: ${kr.Highlight};
        border-color: ${kr.ButtonText};
        box-shadow: 0 0 0 calc((${Ce} - ${Fe}) * 1px)
        ${kr.HighlightText};
        color: ${kr.HighlightText};
        fill: currentcolor;
      }
      
      .start,
      .end,
      .indicator,
      .select-indicator,
      ::slotted(svg) {
        color: ${kr.ButtonText};
        fill: currentcolor;
      }
      `))},$a=(e,t)=>yr.css`
  ${va(e,t)}

  :host(:empty) .listbox {
    display: none;
  }

  :host([disabled]) *,
  :host([disabled]) {
    cursor: ${q.disabledCursor};
    user-select: none;
  }

  :host(:focus-within:not([disabled])) {
    border-color: ${Gt};
    box-shadow: 0 0 0 calc((${Ce} - ${Fe}) * 1px)
      ${Gt};
  }

  :host([aria-invalid='true']:focus-within:not([disabled])) {
    border-color: ${Zo};
    box-shadow: 0 0 0 calc((${Ce} - ${Fe}) * 1px)
      ${Zo};
  }

  .selected-value {
    -webkit-appearance: none;
    background: transparent;
    border: none;
    color: inherit;
    font-size: ${Ve};
    line-height: ${Se};
    height: calc(100% - (${Fe} * 1px));
    margin: auto 0;
    width: 100%;
  }

  .selected-value:hover,
    .selected-value:${q.focusVisible},
    .selected-value:disabled,
    .selected-value:active {
    outline: none;
  }
`;class xa extends q.Combobox{connectedCallback(){super.connectedCallback(),this.setAutoWidth()}slottedOptionsChanged(e,t){super.slottedOptionsChanged(e,t),this.setAutoWidth()}autoWidthChanged(e,t){t?this.setAutoWidth():this.style.removeProperty("width")}setAutoWidth(){if(!this.autoWidth||!this.isConnected)return;let e=this.listbox.getBoundingClientRect().width;0===e&&this.listbox.hidden&&(Object.assign(this.listbox.style,{visibility:"hidden"}),this.listbox.removeAttribute("hidden"),e=this.listbox.getBoundingClientRect().width,this.listbox.setAttribute("hidden",""),this.listbox.style.removeProperty("visibility")),e>0&&Object.assign(this.style,{width:`${e}px`})}maxHeightChanged(e,t){this.updateComputedStylesheet()}updateComputedStylesheet(){this.computedStylesheet&&this.$fastController.removeStyles(this.computedStylesheet);const e=Math.floor(this.maxHeight/Eo.getValueFor(this)).toString();this.computedStylesheet=yr.css`
      :host {
        --listbox-max-height: ${e};
      }
    `,this.$fastController.addStyles(this.computedStylesheet)}}zr([(0,yr.attr)({attribute:"autowidth",mode:"boolean"})],xa.prototype,"autoWidth",void 0),zr([(0,yr.attr)({attribute:"minimal",mode:"boolean"})],xa.prototype,"minimal",void 0),zr([yr.attr],xa.prototype,"scale",void 0);const ya=xa.compose({baseName:"combobox",baseClass:q.Combobox,template:q.comboboxTemplate,styles:$a,shadowOptions:{delegatesFocus:!0},indicator:'\n        <svg\n            class="select-indicator"\n            part="select-indicator"\n            viewBox="0 0 12 7"\n            xmlns="http://www.w3.org/2000/svg"\n        >\n            <path\n                d="M11.85.65c.2.2.2.5 0 .7L6.4 6.84a.55.55 0 01-.78 0L.14 1.35a.5.5 0 11.71-.7L6 5.8 11.15.65c.2-.2.5-.2.7 0z"\n            />\n        </svg>\n    '}),wa=(e,t)=>yr.css`
  :host {
    display: flex;
    position: relative;
    flex-direction: column;
  }
`,ka=(e,t)=>yr.css`
  :host {
    display: grid;
    padding: 1px 0;
    box-sizing: border-box;
    width: 100%;
    border-bottom: calc(${Fe} * 1px) solid ${Go};
  }

  :host(.header) {
  }

  :host(.sticky-header) {
    background: ${lo};
    position: sticky;
    top: 0;
  }
`,Fa=(e,t)=>yr.css`
    :host {
      padding: calc(${xe} * 1px) calc(${xe} * 3px);
      color: ${Ho};
      box-sizing: border-box;
      font-family: ${ge};
      font-size: ${Ve};
      line-height: ${Se};
      font-weight: 400;
      border: transparent calc(${Ce} * 1px) solid;
      overflow: hidden;
      white-space: nowrap;
      border-radius: calc(${ve} * 1px);
    }

    :host(.column-header) {
      font-weight: 600;
    }

    :host(:${q.focusVisible}) {
      outline: calc(${Ce} * 1px) solid ${Gt};
      color: ${Ho};
    }
  `.withBehaviors((0,q.forcedColorsStylesheetBehavior)(yr.css`
      :host {
        forced-color-adjust: none;
        border-color: transparent;
        background: ${kr.Field};
        color: ${kr.FieldText};
      }

      :host(:${q.focusVisible}) {
        border-color: ${kr.FieldText};
        box-shadow: 0 0 0 2px inset ${kr.Field};
        color: ${kr.FieldText};
      }
    `));class Ca extends q.DataGridCell{}const Va=Ca.compose({baseName:"data-grid-cell",baseClass:q.DataGridCell,template:q.dataGridCellTemplate,styles:Fa});class Sa extends q.DataGridRow{}const Da=Sa.compose({baseName:"data-grid-row",baseClass:q.DataGridRow,template:q.dataGridRowTemplate,styles:ka});class Ta extends q.DataGrid{}const za=Ta.compose({baseName:"data-grid",baseClass:q.DataGrid,template:q.dataGridTemplate,styles:wa});var Ba=o(27081);class ja extends q.FoundationElement{}class La extends((0,q.FormAssociated)(ja)){constructor(){super(...arguments),this.proxy=document.createElement("input")}}const Na={toView(e){if(null==e)return null;const t=new Date(e);return"Invalid Date"===t.toString()?null:`${t.getFullYear().toString().padStart(4,"0")}-${(t.getMonth()+1).toString().padStart(2,"0")}-${t.getDate().toString().padStart(2,"0")}`},fromView(e){if(null==e)return null;const t=new Date(e);return"Invalid Date"===t.toString()?null:t}},Ha="Invalid Date";class Oa extends La{constructor(){super(...arguments),this.step=1,this.isUserInput=!1}readOnlyChanged(){this.proxy instanceof HTMLInputElement&&(this.proxy.readOnly=this.readOnly,this.validate())}autofocusChanged(){this.proxy instanceof HTMLInputElement&&(this.proxy.autofocus=this.autofocus,this.validate())}listChanged(){this.proxy instanceof HTMLInputElement&&(this.proxy.setAttribute("list",this.list),this.validate())}maxChanged(e,t){var o;this.max=t<(null!==(o=this.min)&&void 0!==o?o:t)?this.min:t,this.value=this.getValidValue(this.value)}minChanged(e,t){var o;this.min=t>(null!==(o=this.max)&&void 0!==o?o:t)?this.max:t,this.value=this.getValidValue(this.value)}get valueAsNumber(){return new Date(super.value).valueOf()}set valueAsNumber(e){this.value=new Date(e).toString()}get valueAsDate(){return new Date(super.value)}set valueAsDate(e){this.value=e.toString()}valueChanged(e,t){this.value=this.getValidValue(t),t===this.value&&(this.control&&!this.isUserInput&&(this.control.value=this.value),super.valueChanged(e,this.value),void 0===e||this.isUserInput||this.$emit("change"),this.isUserInput=!1)}getValidValue(e){var t,o;let r=new Date(e);return r.toString()===Ha?r="":(r=r>(null!==(t=this.max)&&void 0!==t?t:r)?this.max:r,r=r<(null!==(o=this.min)&&void 0!==o?o:r)?this.min:r,r=`${r.getFullYear().toString().padStart(4,"0")}-${(r.getMonth()+1).toString().padStart(2,"0")}-${r.getDate().toString().padStart(2,"0")}`),r}stepUp(){const e=864e5*this.step,t=new Date(this.value);this.value=new Date(t.toString()!==Ha?t.valueOf()+e:0).toString()}stepDown(){const e=864e5*this.step,t=new Date(this.value);this.value=new Date(t.toString()!==Ha?Math.max(t.valueOf()-e,0):0).toString()}connectedCallback(){super.connectedCallback(),this.validate(),this.control.value=this.value,this.autofocus&&yr.DOM.queueUpdate((()=>{this.focus()})),this.appearance||(this.appearance="outline")}handleTextInput(){this.isUserInput=!0,this.value=this.control.value}handleChange(){this.$emit("change")}handleKeyDown(e){switch(e.key){case Ba.SB:return this.stepUp(),!1;case Ba.iF:return this.stepDown(),!1}return!0}handleBlur(){this.control.value=this.value}}zr([yr.attr],Oa.prototype,"appearance",void 0),zr([(0,yr.attr)({attribute:"readonly",mode:"boolean"})],Oa.prototype,"readOnly",void 0),zr([(0,yr.attr)({mode:"boolean"})],Oa.prototype,"autofocus",void 0),zr([yr.attr],Oa.prototype,"list",void 0),zr([(0,yr.attr)({converter:yr.nullableNumberConverter})],Oa.prototype,"step",void 0),zr([(0,yr.attr)({converter:Na})],Oa.prototype,"max",void 0),zr([(0,yr.attr)({converter:Na})],Oa.prototype,"min",void 0),zr([yr.observable],Oa.prototype,"defaultSlottedNodes",void 0),(0,q.applyMixins)(Oa,q.StartEnd,q.DelegatesARIATextbox);const Ra=yr.css`
  ${(0,q.display)("inline-block")} :host {
    font-family: ${ge};
    outline: none;
    user-select: none;
    /* Ensure to display focus highlight */
    margin: calc((${Ce} - ${Fe}) * 1px);
  }

  .root {
    box-sizing: border-box;
    position: relative;
    display: flex;
    flex-direction: row;
    color: ${Ho};
    background: ${uo};
    border-radius: calc(${ve} * 1px);
    border: calc(${Fe} * 1px) solid ${wo};
    height: calc(${Fr} * 1px);
  }

  :host([aria-invalid='true']) .root {
    border-color: ${Uo};
  }

  .control {
    -webkit-appearance: none;
    font: inherit;
    background: transparent;
    border: 0;
    color: inherit;
    height: calc(100% - 4px);
    width: 100%;
    margin-top: auto;
    margin-bottom: auto;
    border: none;
    padding: 0 calc(${xe} * 2px + 1px);
    font-size: ${Ve};
    line-height: ${Se};
  }

  .control:placeholder-shown {
    text-overflow: ellipsis;
  }

  .control:hover,
  .control:${q.focusVisible},
  .control:disabled,
  .control:active {
    outline: none;
  }

  .label {
    display: block;
    color: ${Ho};
    cursor: pointer;
    font-size: ${Ve};
    line-height: ${Se};
    margin-bottom: 4px;
  }

  .label__hidden {
    display: none;
    visibility: hidden;
  }

  .start,
  .end {
    margin: auto;
    fill: currentcolor;
  }

  ::slotted(svg) {
    /* TODO: adaptive typography https://github.com/microsoft/fast/issues/2432 */
    width: 16px;
    height: 16px;
  }

  .start {
    margin-inline-start: 11px;
  }

  .end {
    margin-inline-end: 11px;
  }

  :host(:hover:not([disabled])) .root {
    background: ${po};
    border-color: ${ko};
  }

  :host([aria-invalid='true']:hover:not([disabled])) .root {
    border-color: ${Xo};
  }

  :host(:active:not([disabled])) .root {
    background: ${po};
    border-color: ${Fo};
  }

  :host([aria-invalid='true']:active:not([disabled])) .root {
    border-color: ${Yo};
  }

  :host(:focus-within:not([disabled])) .root {
    border-color: ${Gt};
    box-shadow: 0 0 0 calc((${Ce} - ${Fe}) * 1px)
      ${Gt};
  }

  :host([aria-invalid='true']:focus-within:not([disabled])) .root {
    border-color: ${Zo};
    box-shadow: 0 0 0 calc((${Ce} - ${Fe}) * 1px)
      ${Zo};
  }

  :host([appearance='filled']) .root {
    background: ${lo};
  }

  :host([appearance='filled']:hover:not([disabled])) .root {
    background: ${no};
  }

  :host([disabled]) .label,
  :host([readonly]) .label,
  :host([readonly]) .control,
  :host([disabled]) .control {
    cursor: ${q.disabledCursor};
  }

  :host([disabled]) {
    opacity: ${ke};
  }

  :host([disabled]) .control {
    border-color: ${Ro};
  }
`.withBehaviors((0,q.forcedColorsStylesheetBehavior)(yr.css`
    .root,
    :host([appearance='filled']) .root {
      forced-color-adjust: none;
      background: ${kr.Field};
      border-color: ${kr.FieldText};
    }
    :host([aria-invalid='true']) .root {
      border-style: dashed;
    }
    :host(:hover:not([disabled])) .root,
    :host([appearance='filled']:hover:not([disabled])) .root,
    :host([appearance='filled']:hover) .root {
      background: ${kr.Field};
      border-color: ${kr.Highlight};
    }
    .start,
    .end {
      fill: currentcolor;
    }
    :host([disabled]) {
      opacity: 1;
    }
    :host([disabled]) .root,
    :host([appearance='filled']:hover[disabled]) .root {
      border-color: ${kr.GrayText};
      background: ${kr.Field};
    }
    :host(:focus-within:enabled) .root {
      border-color: ${kr.Highlight};
      box-shadow: 0 0 0 calc((${Ce} - ${Fe}) * 1px)
        ${kr.Highlight};
    }
    input::placeholder {
      color: ${kr.GrayText};
    }
  `)),Pa=(e,t)=>yr.css`
  ${Ra}
`,Ia=(e,t)=>yr.html`
  <template class="${e=>e.readOnly?"readonly":""}">
    <label
      part="label"
      for="control"
      class="${e=>e.defaultSlottedNodes&&e.defaultSlottedNodes.length?"label":"label label__hidden"}"
    >
      <slot
        ${(0,yr.slotted)({property:"defaultSlottedNodes",filter:q.whitespaceFilter})}
      ></slot>
    </label>
    <div class="root" part="root">
      ${(0,q.startSlotTemplate)(e,t)}
      <input
        class="control"
        part="control"
        id="control"
        @input="${e=>e.handleTextInput()}"
        @change="${e=>e.handleChange()}"
        ?autofocus="${e=>e.autofocus}"
        ?disabled="${e=>e.disabled}"
        list="${e=>e.list}"
        ?readonly="${e=>e.readOnly}"
        ?required="${e=>e.required}"
        :value="${e=>e.value}"
        type="date"
        aria-atomic="${e=>e.ariaAtomic}"
        aria-busy="${e=>e.ariaBusy}"
        aria-controls="${e=>e.ariaControls}"
        aria-current="${e=>e.ariaCurrent}"
        aria-describedby="${e=>e.ariaDescribedby}"
        aria-details="${e=>e.ariaDetails}"
        aria-disabled="${e=>e.ariaDisabled}"
        aria-errormessage="${e=>e.ariaErrormessage}"
        aria-flowto="${e=>e.ariaFlowto}"
        aria-haspopup="${e=>e.ariaHaspopup}"
        aria-hidden="${e=>e.ariaHidden}"
        aria-invalid="${e=>e.ariaInvalid}"
        aria-keyshortcuts="${e=>e.ariaKeyshortcuts}"
        aria-label="${e=>e.ariaLabel}"
        aria-labelledby="${e=>e.ariaLabelledby}"
        aria-live="${e=>e.ariaLive}"
        aria-owns="${e=>e.ariaOwns}"
        aria-relevant="${e=>e.ariaRelevant}"
        aria-roledescription="${e=>e.ariaRoledescription}"
        ${(0,yr.ref)("control")}
      />
      ${(0,q.endSlotTemplate)(e,t)}
    </div>
  </template>
`,Aa=Oa.compose({baseName:"date-field",styles:Pa,template:Ia,shadowOptions:{delegatesFocus:!0}}),Ma={toView:e=>null==e?null:null==e?void 0:e.toColorString(),fromView(e){if(null==e)return null;const t=f(e);return t?R.create(t.r,t.g,t.b):null}},Ga=yr.css`
  :host {
    background-color: ${Ot};
    color: ${Ho};
  }
`.withBehaviors((0,q.forcedColorsStylesheetBehavior)(yr.css`
    :host {
      background-color: ${kr.ButtonFace};
      box-shadow: 0 0 0 1px ${kr.CanvasText};
      color: ${kr.ButtonText};
    }
  `));function Ea(e){return(t,o)=>{t[o+"Changed"]=function(t,o){null!=o?e.setValueFor(this,o):e.deleteValueFor(this)}}}class _a extends q.FoundationElement{constructor(){super(),this.noPaint=!1;const e={handleChange:this.noPaintChanged.bind(this)};yr.Observable.getNotifier(this).subscribe(e,"fillColor"),yr.Observable.getNotifier(this).subscribe(e,"baseLayerLuminance")}noPaintChanged(){this.noPaint||void 0===this.fillColor&&!this.baseLayerLuminance?this.$fastController.removeStyles(Ga):this.$fastController.addStyles(Ga)}}zr([(0,yr.attr)({attribute:"no-paint",mode:"boolean"})],_a.prototype,"noPaint",void 0),zr([(0,yr.attr)({attribute:"fill-color",converter:Ma}),Ea(Ot)],_a.prototype,"fillColor",void 0),zr([(0,yr.attr)({attribute:"accent-color",converter:Ma,mode:"fromView"}),Ea(wt)],_a.prototype,"accentColor",void 0),zr([(0,yr.attr)({attribute:"neutral-color",converter:Ma,mode:"fromView"}),Ea(xt)],_a.prototype,"neutralColor",void 0),zr([(0,yr.attr)({attribute:"error-color",converter:Ma,mode:"fromView"}),Ea(_o)],_a.prototype,"errorColor",void 0),zr([(0,yr.attr)({converter:yr.nullableNumberConverter}),Ea($e)],_a.prototype,"density",void 0),zr([(0,yr.attr)({attribute:"design-unit",converter:yr.nullableNumberConverter}),Ea(xe)],_a.prototype,"designUnit",void 0),zr([(0,yr.attr)({attribute:"direction"}),Ea(we)],_a.prototype,"direction",void 0),zr([(0,yr.attr)({attribute:"base-height-multiplier",converter:yr.nullableNumberConverter}),Ea(be)],_a.prototype,"baseHeightMultiplier",void 0),zr([(0,yr.attr)({attribute:"base-horizontal-spacing-multiplier",converter:yr.nullableNumberConverter}),Ea(fe)],_a.prototype,"baseHorizontalSpacingMultiplier",void 0),zr([(0,yr.attr)({attribute:"control-corner-radius",converter:yr.nullableNumberConverter}),Ea(ve)],_a.prototype,"controlCornerRadius",void 0),zr([(0,yr.attr)({attribute:"stroke-width",converter:yr.nullableNumberConverter}),Ea(Fe)],_a.prototype,"strokeWidth",void 0),zr([(0,yr.attr)({attribute:"focus-stroke-width",converter:yr.nullableNumberConverter}),Ea(Ce)],_a.prototype,"focusStrokeWidth",void 0),zr([(0,yr.attr)({attribute:"disabled-opacity",converter:yr.nullableNumberConverter}),Ea(ke)],_a.prototype,"disabledOpacity",void 0),zr([(0,yr.attr)({attribute:"type-ramp-minus-2-font-size"}),Ea(ze)],_a.prototype,"typeRampMinus2FontSize",void 0),zr([(0,yr.attr)({attribute:"type-ramp-minus-2-line-height"}),Ea(Be)],_a.prototype,"typeRampMinus2LineHeight",void 0),zr([(0,yr.attr)({attribute:"type-ramp-minus-1-font-size"}),Ea(De)],_a.prototype,"typeRampMinus1FontSize",void 0),zr([(0,yr.attr)({attribute:"type-ramp-minus-1-line-height"}),Ea(Te)],_a.prototype,"typeRampMinus1LineHeight",void 0),zr([(0,yr.attr)({attribute:"type-ramp-base-font-size"}),Ea(Ve)],_a.prototype,"typeRampBaseFontSize",void 0),zr([(0,yr.attr)({attribute:"type-ramp-base-line-height"}),Ea(Se)],_a.prototype,"typeRampBaseLineHeight",void 0),zr([(0,yr.attr)({attribute:"type-ramp-plus-1-font-size"}),Ea(je)],_a.prototype,"typeRampPlus1FontSize",void 0),zr([(0,yr.attr)({attribute:"type-ramp-plus-1-line-height"}),Ea(Le)],_a.prototype,"typeRampPlus1LineHeight",void 0),zr([(0,yr.attr)({attribute:"type-ramp-plus-2-font-size"}),Ea(Ne)],_a.prototype,"typeRampPlus2FontSize",void 0),zr([(0,yr.attr)({attribute:"type-ramp-plus-2-line-height"}),Ea(He)],_a.prototype,"typeRampPlus2LineHeight",void 0),zr([(0,yr.attr)({attribute:"type-ramp-plus-3-font-size"}),Ea(Oe)],_a.prototype,"typeRampPlus3FontSize",void 0),zr([(0,yr.attr)({attribute:"type-ramp-plus-3-line-height"}),Ea(Re)],_a.prototype,"typeRampPlus3LineHeight",void 0),zr([(0,yr.attr)({attribute:"type-ramp-plus-4-font-size"}),Ea(Pe)],_a.prototype,"typeRampPlus4FontSize",void 0),zr([(0,yr.attr)({attribute:"type-ramp-plus-4-line-height"}),Ea(Ie)],_a.prototype,"typeRampPlus4LineHeight",void 0),zr([(0,yr.attr)({attribute:"type-ramp-plus-5-font-size"}),Ea(Ae)],_a.prototype,"typeRampPlus5FontSize",void 0),zr([(0,yr.attr)({attribute:"type-ramp-plus-5-line-height"}),Ea(Me)],_a.prototype,"typeRampPlus5LineHeight",void 0),zr([(0,yr.attr)({attribute:"type-ramp-plus-6-font-size"}),Ea(Ge)],_a.prototype,"typeRampPlus6FontSize",void 0),zr([(0,yr.attr)({attribute:"type-ramp-plus-6-line-height"}),Ea(Ee)],_a.prototype,"typeRampPlus6LineHeight",void 0),zr([(0,yr.attr)({attribute:"accent-fill-rest-delta",converter:yr.nullableNumberConverter}),Ea(_e)],_a.prototype,"accentFillRestDelta",void 0),zr([(0,yr.attr)({attribute:"accent-fill-hover-delta",converter:yr.nullableNumberConverter}),Ea(qe)],_a.prototype,"accentFillHoverDelta",void 0),zr([(0,yr.attr)({attribute:"accent-fill-active-delta",converter:yr.nullableNumberConverter}),Ea(We)],_a.prototype,"accentFillActiveDelta",void 0),zr([(0,yr.attr)({attribute:"accent-fill-focus-delta",converter:yr.nullableNumberConverter}),Ea(Ue)],_a.prototype,"accentFillFocusDelta",void 0),zr([(0,yr.attr)({attribute:"accent-foreground-rest-delta",converter:yr.nullableNumberConverter}),Ea(Xe)],_a.prototype,"accentForegroundRestDelta",void 0),zr([(0,yr.attr)({attribute:"accent-foreground-hover-delta",converter:yr.nullableNumberConverter}),Ea(Ye)],_a.prototype,"accentForegroundHoverDelta",void 0),zr([(0,yr.attr)({attribute:"accent-foreground-active-delta",converter:yr.nullableNumberConverter}),Ea(Ze)],_a.prototype,"accentForegroundActiveDelta",void 0),zr([(0,yr.attr)({attribute:"accent-foreground-focus-delta",converter:yr.nullableNumberConverter}),Ea(Je)],_a.prototype,"accentForegroundFocusDelta",void 0),zr([(0,yr.attr)({attribute:"neutral-fill-rest-delta",converter:yr.nullableNumberConverter}),Ea(Ke)],_a.prototype,"neutralFillRestDelta",void 0),zr([(0,yr.attr)({attribute:"neutral-fill-hover-delta",converter:yr.nullableNumberConverter}),Ea(Qe)],_a.prototype,"neutralFillHoverDelta",void 0),zr([(0,yr.attr)({attribute:"neutral-fill-active-delta",converter:yr.nullableNumberConverter}),Ea(et)],_a.prototype,"neutralFillActiveDelta",void 0),zr([(0,yr.attr)({attribute:"neutral-fill-focus-delta",converter:yr.nullableNumberConverter}),Ea(tt)],_a.prototype,"neutralFillFocusDelta",void 0),zr([(0,yr.attr)({attribute:"neutral-fill-input-rest-delta",converter:yr.nullableNumberConverter}),Ea(ot)],_a.prototype,"neutralFillInputRestDelta",void 0),zr([(0,yr.attr)({attribute:"neutral-fill-input-hover-delta",converter:yr.nullableNumberConverter}),Ea(rt)],_a.prototype,"neutralFillInputHoverDelta",void 0),zr([(0,yr.attr)({attribute:"neutral-fill-input-active-delta",converter:yr.nullableNumberConverter}),Ea(at)],_a.prototype,"neutralFillInputActiveDelta",void 0),zr([(0,yr.attr)({attribute:"neutral-fill-input-focus-delta",converter:yr.nullableNumberConverter}),Ea(it)],_a.prototype,"neutralFillInputFocusDelta",void 0),zr([(0,yr.attr)({attribute:"neutral-fill-stealth-rest-delta",converter:yr.nullableNumberConverter}),Ea(lt)],_a.prototype,"neutralFillStealthRestDelta",void 0),zr([(0,yr.attr)({attribute:"neutral-fill-stealth-hover-delta",converter:yr.nullableNumberConverter}),Ea(nt)],_a.prototype,"neutralFillStealthHoverDelta",void 0),zr([(0,yr.attr)({attribute:"neutral-fill-stealth-active-delta",converter:yr.nullableNumberConverter}),Ea(st)],_a.prototype,"neutralFillStealthActiveDelta",void 0),zr([(0,yr.attr)({attribute:"neutral-fill-stealth-focus-delta",converter:yr.nullableNumberConverter}),Ea(ct)],_a.prototype,"neutralFillStealthFocusDelta",void 0),zr([(0,yr.attr)({attribute:"neutral-fill-strong-hover-delta",converter:yr.nullableNumberConverter}),Ea(ht)],_a.prototype,"neutralFillStrongHoverDelta",void 0),zr([(0,yr.attr)({attribute:"neutral-fill-strong-active-delta",converter:yr.nullableNumberConverter}),Ea(ut)],_a.prototype,"neutralFillStrongActiveDelta",void 0),zr([(0,yr.attr)({attribute:"neutral-fill-strong-focus-delta",converter:yr.nullableNumberConverter}),Ea(pt)],_a.prototype,"neutralFillStrongFocusDelta",void 0),zr([(0,yr.attr)({attribute:"base-layer-luminance",converter:yr.nullableNumberConverter}),Ea(me)],_a.prototype,"baseLayerLuminance",void 0),zr([(0,yr.attr)({attribute:"neutral-fill-layer-rest-delta",converter:yr.nullableNumberConverter}),Ea(gt)],_a.prototype,"neutralFillLayerRestDelta",void 0),zr([(0,yr.attr)({attribute:"neutral-stroke-divider-rest-delta",converter:yr.nullableNumberConverter}),Ea($t)],_a.prototype,"neutralStrokeDividerRestDelta",void 0),zr([(0,yr.attr)({attribute:"neutral-stroke-rest-delta",converter:yr.nullableNumberConverter}),Ea(bt)],_a.prototype,"neutralStrokeRestDelta",void 0),zr([(0,yr.attr)({attribute:"neutral-stroke-hover-delta",converter:yr.nullableNumberConverter}),Ea(ft)],_a.prototype,"neutralStrokeHoverDelta",void 0),zr([(0,yr.attr)({attribute:"neutral-stroke-active-delta",converter:yr.nullableNumberConverter}),Ea(mt)],_a.prototype,"neutralStrokeActiveDelta",void 0),zr([(0,yr.attr)({attribute:"neutral-stroke-focus-delta",converter:yr.nullableNumberConverter}),Ea(vt)],_a.prototype,"neutralStrokeFocusDelta",void 0);const qa=(e,t)=>yr.html` <slot></slot> `,Wa=(e,t)=>yr.css`
  ${(0,q.display)("block")}
`,Ua=_a.compose({baseName:"design-system-provider",template:qa,styles:Wa}),Xa=(e,t)=>yr.css`
  :host([hidden]) {
    display: none;
  }

  :host {
    --elevation: 14;
    --dialog-height: 480px;
    --dialog-width: 640px;
    display: block;
  }

  .overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.3);
    touch-action: none;
  }

  .positioning-region {
    display: flex;
    justify-content: center;
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    overflow: auto;
  }

  .control {
    ${ca}
    margin-top: auto;
    margin-bottom: auto;
    width: var(--dialog-width);
    height: var(--dialog-height);
    background-color: ${Ot};
    z-index: 1;
    border-radius: calc(${ve} * 1px);
    border: calc(${Fe} * 1px) solid transparent;
  }
`;class Ya extends q.Dialog{}const Za=Ya.compose({baseName:"dialog",baseClass:q.Dialog,template:q.dialogTemplate,styles:Xa}),Ja=(e,t)=>yr.css`
  .disclosure {
    transition: height 0.35s;
  }

  .disclosure .invoker::-webkit-details-marker {
    display: none;
  }

  .disclosure .invoker {
    list-style-type: none;
  }

  :host([appearance='accent']) .invoker {
    background: ${It};
    color: ${qt};
    font-family: ${ge};
    font-size: ${Ve};
    border-radius: calc(${ve} * 1px);
    outline: none;
    cursor: pointer;
    margin: 16px 0;
    padding: 12px;
    max-width: max-content;
  }

  :host([appearance='accent']) .invoker:active {
    background: ${Mt};
    color: ${Ut};
  }

  :host([appearance='accent']) .invoker:hover {
    background: ${At};
    color: ${Wt};
  }

  :host([appearance='lightweight']) .invoker {
    background: transparent;
    color: ${to};
    border-bottom: calc(${Fe} * 1px) solid ${to};
    cursor: pointer;
    width: max-content;
    margin: 16px 0;
  }

  :host([appearance='lightweight']) .invoker:active {
    border-bottom-color: ${ro};
  }

  :host([appearance='lightweight']) .invoker:hover {
    border-bottom-color: ${oo};
  }

  .disclosure[open] .invoker ~ * {
    animation: fadeIn 0.5s ease-in-out;
  }

  @keyframes fadeIn {
    0% {
      opacity: 0;
    }
    100% {
      opacity: 1;
    }
  }
`;class Ka extends q.Disclosure{constructor(){super(...arguments),this.height=0,this.totalHeight=0}connectedCallback(){super.connectedCallback(),this.appearance||(this.appearance="accent")}appearanceChanged(e,t){e!==t&&(this.classList.add(t),this.classList.remove(e))}onToggle(){super.onToggle(),this.details.style.setProperty("height",`${this.disclosureHeight}px`)}setup(){super.setup();const e=()=>this.details.getBoundingClientRect().height;this.show(),this.totalHeight=e(),this.hide(),this.height=e(),this.expanded&&this.show()}get disclosureHeight(){return this.expanded?this.totalHeight:this.height}}zr([yr.attr],Ka.prototype,"appearance",void 0);const Qa=Ka.compose({baseName:"disclosure",baseClass:q.Disclosure,template:q.disclosureTemplate,styles:Ja}),ei=(e,t)=>yr.css`
  ${(0,q.display)("block")} :host {
    box-sizing: content-box;
    height: 0;
    margin: calc(${xe} * 1px) 0;
    border-top: calc(${Fe} * 1px) solid ${Go};
    border-left: none;
  }

  :host([orientation='vertical']) {
    height: 100%;
    margin: 0 calc(${xe} * 1px);
    border-top: none;
    border-left: calc(${Fe} * 1px) solid ${Go};
  }
`;class ti extends q.Divider{}const oi=ti.compose({baseName:"divider",baseClass:q.Divider,template:q.dividerTemplate,styles:ei});class ri extends q.ListboxElement{sizeChanged(e,t){super.sizeChanged(e,t),this.updateComputedStylesheet()}updateComputedStylesheet(){this.computedStylesheet&&this.$fastController.removeStyles(this.computedStylesheet);const e=`${this.size}`;this.computedStylesheet=yr.css`
      :host {
        --size: ${e};
      }
    `,this.$fastController.addStyles(this.computedStylesheet)}}const ai=ri.compose({baseName:"listbox",baseClass:q.ListboxElement,template:q.listboxTemplate,styles:ma}),ii=(e,t)=>yr.css`
    ${(0,q.display)("block")} :host {
      --elevation: 11;
      background: ${Ot};
      border: calc(${Fe} * 1px) solid transparent;
      ${ca}
      margin: 0;
      border-radius: calc(${ve} * 1px);
      padding: calc(${xe} * 1px) 0;
      max-width: 368px;
      min-width: 64px;
    }

    :host([slot='submenu']) {
      width: max-content;
      margin: 0 calc(${xe} * 1px);
    }

    ::slotted(hr) {
      box-sizing: content-box;
      height: 0;
      margin: 0;
      border: none;
      border-top: calc(${Fe} * 1px) solid ${Go};
    }
  `.withBehaviors((0,q.forcedColorsStylesheetBehavior)(yr.css`
      :host {
        background: ${kr.Canvas};
        border-color: ${kr.CanvasText};
      }
    `));class li extends q.Menu{connectedCallback(){super.connectedCallback(),Ot.setValueFor(this,St)}}const ni=li.compose({baseName:"menu",baseClass:q.Menu,template:q.menuTemplate,styles:ii}),si=(e,t)=>yr.css`
    ${(0,q.display)("grid")} :host {
      contain: layout;
      overflow: visible;
      font-family: ${ge};
      outline: none;
      box-sizing: border-box;
      height: calc(${Fr} * 1px);
      grid-template-columns: minmax(42px, auto) 1fr minmax(42px, auto);
      grid-template-rows: auto;
      justify-items: center;
      align-items: center;
      padding: 0;
      margin: 0 calc(${xe} * 1px);
      white-space: nowrap;
      background: ${mo};
      color: ${Ho};
      fill: currentcolor;
      cursor: pointer;
      font-size: ${Ve};
      line-height: ${Se};
      border-radius: calc(${ve} * 1px);
      border: calc(${Ce} * 1px) solid transparent;
    }

    :host(:hover) {
      position: relative;
      z-index: 1;
    }

    :host(.indent-0) {
      grid-template-columns: auto 1fr minmax(42px, auto);
    }
    :host(.indent-0) .content {
      grid-column: 1;
      grid-row: 1;
      margin-inline-start: 10px;
    }
    :host(.indent-0) .expand-collapse-glyph-container {
      grid-column: 5;
      grid-row: 1;
    }
    :host(.indent-2) {
      grid-template-columns:
        minmax(42px, auto) minmax(42px, auto) 1fr minmax(42px, auto)
        minmax(42px, auto);
    }
    :host(.indent-2) .content {
      grid-column: 3;
      grid-row: 1;
      margin-inline-start: 10px;
    }
    :host(.indent-2) .expand-collapse-glyph-container {
      grid-column: 5;
      grid-row: 1;
    }
    :host(.indent-2) .start {
      grid-column: 2;
    }
    :host(.indent-2) .end {
      grid-column: 4;
    }

    :host(:${q.focusVisible}) {
      border-color: ${Gt};
      background: ${xo};
      color: ${Ho};
    }

    :host(:hover) {
      background: ${vo};
      color: ${Ho};
    }

    :host(:active) {
      background: ${$o};
    }

    :host([aria-checked='true']),
    :host(.expanded) {
      background: ${lo};
      color: ${Ho};
    }

    :host([disabled]) {
      cursor: ${q.disabledCursor};
      opacity: ${ke};
    }

    :host([disabled]:hover) {
      color: ${Ho};
      fill: currentcolor;
      background: ${mo};
    }

    :host([disabled]:hover) .start,
    :host([disabled]:hover) .end,
    :host([disabled]:hover)::slotted(svg) {
      fill: ${Ho};
    }

    .expand-collapse-glyph {
      /* TODO: adaptive typography https://github.com/microsoft/fast/issues/2432 */
      width: calc((16 + ${$e}) * 1px);
      height: calc((16 + ${$e}) * 1px);
      fill: currentcolor;
    }

    .content {
      grid-column-start: 2;
      justify-self: start;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .start,
    .end {
      display: flex;
      justify-content: center;
    }

    ::slotted(svg) {
      /* TODO: adaptive typography https://github.com/microsoft/fast/issues/2432 */
      width: 16px;
      height: 16px;

      /* Something like that would do if the typography is adaptive
      font-size: inherit;
      width: ${je};
      height: ${je};
      */
    }

    :host(:hover) .start,
    :host(:hover) .end,
    :host(:hover)::slotted(svg),
    :host(:active) .start,
    :host(:active) .end,
    :host(:active)::slotted(svg) {
      fill: ${Ho};
    }

    :host(.indent-0[aria-haspopup='menu']) {
      display: grid;
      grid-template-columns: minmax(42px, auto) auto 1fr minmax(42px, auto) minmax(
          42px,
          auto
        );
      align-items: center;
      min-height: 32px;
    }

    :host(.indent-1[aria-haspopup='menu']),
    :host(.indent-1[role='menuitemcheckbox']),
    :host(.indent-1[role='menuitemradio']) {
      display: grid;
      grid-template-columns: minmax(42px, auto) auto 1fr minmax(42px, auto) minmax(
          42px,
          auto
        );
      align-items: center;
      min-height: 32px;
    }

    :host(.indent-2:not([aria-haspopup='menu'])) .end {
      grid-column: 5;
    }

    :host .input-container,
    :host .expand-collapse-glyph-container {
      display: none;
    }

    :host([aria-haspopup='menu']) .expand-collapse-glyph-container,
    :host([role='menuitemcheckbox']) .input-container,
    :host([role='menuitemradio']) .input-container {
      display: grid;
      margin-inline-end: 10px;
    }

    :host([aria-haspopup='menu']) .content,
    :host([role='menuitemcheckbox']) .content,
    :host([role='menuitemradio']) .content {
      grid-column-start: 3;
    }

    :host([aria-haspopup='menu'].indent-0) .content {
      grid-column-start: 1;
    }

    :host([aria-haspopup='menu']) .end,
    :host([role='menuitemcheckbox']) .end,
    :host([role='menuitemradio']) .end {
      grid-column-start: 4;
    }

    :host .expand-collapse,
    :host .checkbox,
    :host .radio {
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      width: 20px;
      height: 20px;
      box-sizing: border-box;
      outline: none;
      margin-inline-start: 10px;
    }

    :host .checkbox,
    :host .radio {
      border: calc(${Fe} * 1px) solid ${Ho};
    }

    :host([aria-checked='true']) .checkbox,
    :host([aria-checked='true']) .radio {
      background: ${It};
      border-color: ${It};
    }

    :host .checkbox {
      border-radius: calc(${ve} * 1px);
    }

    :host .radio {
      border-radius: 999px;
    }

    :host .checkbox-indicator,
    :host .radio-indicator,
    :host .expand-collapse-indicator,
    ::slotted([slot='checkbox-indicator']),
    ::slotted([slot='radio-indicator']),
    ::slotted([slot='expand-collapse-indicator']) {
      display: none;
    }

    ::slotted([slot='end']:not(svg)) {
      margin-inline-end: 10px;
      color: ${Lo};
    }

    :host([aria-checked='true']) .checkbox-indicator,
    :host([aria-checked='true']) ::slotted([slot='checkbox-indicator']) {
      width: 100%;
      height: 100%;
      display: block;
      fill: ${qt};
      pointer-events: none;
    }

    :host([aria-checked='true']) .radio-indicator {
      position: absolute;
      top: 4px;
      left: 4px;
      right: 4px;
      bottom: 4px;
      border-radius: 999px;
      display: block;
      background: ${qt};
      pointer-events: none;
    }

    :host([aria-checked='true']) ::slotted([slot='radio-indicator']) {
      display: block;
      pointer-events: none;
    }
  `.withBehaviors((0,q.forcedColorsStylesheetBehavior)(yr.css`
      :host {
        border-color: transparent;
        color: ${kr.ButtonText};
        forced-color-adjust: none;
      }

      :host(:hover) {
        background: ${kr.Highlight};
        color: ${kr.HighlightText};
      }

      :host(:hover) .start,
      :host(:hover) .end,
      :host(:hover)::slotted(svg),
      :host(:active) .start,
      :host(:active) .end,
      :host(:active)::slotted(svg) {
        fill: ${kr.HighlightText};
      }

      :host(.expanded) {
        background: ${kr.Highlight};
        border-color: ${kr.Highlight};
        color: ${kr.HighlightText};
      }

      :host(:${q.focusVisible}) {
        background: ${kr.Highlight};
        border-color: ${kr.ButtonText};
        box-shadow: 0 0 0 calc(${Ce} * 1px) inset
          ${kr.HighlightText};
        color: ${kr.HighlightText};
        fill: currentcolor;
      }

      :host([disabled]),
      :host([disabled]:hover),
      :host([disabled]:hover) .start,
      :host([disabled]:hover) .end,
      :host([disabled]:hover)::slotted(svg) {
        background: ${kr.Canvas};
        color: ${kr.GrayText};
        fill: currentcolor;
        opacity: 1;
      }

      :host .expanded-toggle,
      :host .checkbox,
      :host .radio {
        border-color: ${kr.ButtonText};
        background: ${kr.HighlightText};
      }

      :host([checked='true']) .checkbox,
      :host([checked='true']) .radio {
        background: ${kr.HighlightText};
        border-color: ${kr.HighlightText};
      }

      :host(:hover) .expanded-toggle,
            :host(:hover) .checkbox,
            :host(:hover) .radio,
            :host(:${q.focusVisible}) .expanded-toggle,
            :host(:${q.focusVisible}) .checkbox,
            :host(:${q.focusVisible}) .radio,
            :host([checked="true"]:hover) .checkbox,
            :host([checked="true"]:hover) .radio,
            :host([checked="true"]:${q.focusVisible}) .checkbox,
            :host([checked="true"]:${q.focusVisible}) .radio {
        border-color: ${kr.HighlightText};
      }

      :host([aria-checked='true']) {
        background: ${kr.Highlight};
        color: ${kr.HighlightText};
      }

      :host([aria-checked='true']) .checkbox-indicator,
      :host([aria-checked='true']) ::slotted([slot='checkbox-indicator']),
      :host([aria-checked='true']) ::slotted([slot='radio-indicator']) {
        fill: ${kr.Highlight};
      }

      :host([aria-checked='true']) .radio-indicator {
        background: ${kr.Highlight};
      }

      ::slotted([slot='end']:not(svg)) {
        color: ${kr.ButtonText};
      }

      :host(:hover) ::slotted([slot="end"]:not(svg)),
            :host(:${q.focusVisible}) ::slotted([slot="end"]:not(svg)) {
        color: ${kr.HighlightText};
      }
    `),new qr(yr.css`
        .expand-collapse-glyph {
          transform: rotate(0deg);
        }
      `,yr.css`
        .expand-collapse-glyph {
          transform: rotate(180deg);
        }
      `));class ci extends q.MenuItem{}const di=ci.compose({baseName:"menu-item",baseClass:q.MenuItem,template:q.menuItemTemplate,styles:si,checkboxIndicator:'\n        <svg\n            part="checkbox-indicator"\n            class="checkbox-indicator"\n            viewBox="0 0 20 20"\n            xmlns="http://www.w3.org/2000/svg"\n        >\n            <path\n                fill-rule="evenodd"\n                clip-rule="evenodd"\n                d="M8.143 12.6697L15.235 4.5L16.8 5.90363L8.23812 15.7667L3.80005 11.2556L5.27591 9.7555L8.143 12.6697Z"\n            />\n        </svg>\n    ',expandCollapseGlyph:'\n        <svg\n            viewBox="0 0 16 16"\n            xmlns="http://www.w3.org/2000/svg"\n            class="expand-collapse-glyph"\n            part="expand-collapse-glyph"\n        >\n            <path\n                d="M5.00001 12.3263C5.00124 12.5147 5.05566 12.699 5.15699 12.8578C5.25831 13.0167 5.40243 13.1437 5.57273 13.2242C5.74304 13.3047 5.9326 13.3354 6.11959 13.3128C6.30659 13.2902 6.4834 13.2152 6.62967 13.0965L10.8988 8.83532C11.0739 8.69473 11.2153 8.51658 11.3124 8.31402C11.4096 8.11146 11.46 7.88966 11.46 7.66499C11.46 7.44033 11.4096 7.21853 11.3124 7.01597C11.2153 6.81341 11.0739 6.63526 10.8988 6.49467L6.62967 2.22347C6.48274 2.10422 6.30501 2.02912 6.11712 2.00691C5.92923 1.9847 5.73889 2.01628 5.56823 2.09799C5.39757 2.17969 5.25358 2.30817 5.153 2.46849C5.05241 2.62882 4.99936 2.8144 5.00001 3.00369V12.3263Z"\n            />\n        </svg>\n    ',radioIndicator:'\n        <span part="radio-indicator" class="radio-indicator"></span>\n    '}),hi=(e,t)=>yr.css`
  ${Ra}

  .controls {
    opacity: 0;
    margin: auto 0;
  }

  .step-up-glyph,
  .step-down-glyph {
    display: block;
    padding: calc(
        (${xe} + 0.5 * ${$e} + 0.5 * ${ye}) * 1px
      )
      calc((2 + 2 * ${xe} + ${$e} + ${ye}) * 1px);
    cursor: pointer;
  }

  .step-up-glyph:before,
  .step-down-glyph:before {
    content: '';
    display: block;
    border: solid transparent
      calc((2 + ${xe} + 0.5 * ${$e} + 0.5 * ${ye}) * 1px);
  }

  .step-up-glyph:hover:before,
  .step-down-glyph:hover:before {
    background-color: ${no};
  }

  .step-up-glyph:active:before,
  .step-down-glyph:active:before {
    background-color: ${so};
  }

  .step-up-glyph:before {
    border-bottom-color: ${Ho};
  }

  .step-down-glyph:before {
    border-top-color: ${Ho};
  }

  :host(:hover:not([disabled])) .controls,
  :host(:focus-within:not([disabled])) .controls {
    opacity: 1;
  }
`;class ui extends q.NumberField{constructor(){super(...arguments),this.appearance="outline"}}zr([yr.attr],ui.prototype,"appearance",void 0);const pi=ui.compose({baseName:"number-field",baseClass:q.NumberField,styles:hi,template:q.numberFieldTemplate,shadowOptions:{delegatesFocus:!0},stepDownGlyph:'\n        <span class="step-down-glyph" part="step-down-glyph"></span>\n    ',stepUpGlyph:'\n        <span class="step-up-glyph" part="step-up-glyph"></span>\n    '}),gi=(e,t)=>yr.css`
    ${(0,q.display)("inline-flex")} :host {
      align-items: center;
      font-family: ${ge};
      border-radius: calc(${ve} * 1px);
      border: calc(${Ce} * 1px) solid transparent;
      box-sizing: border-box;
      background: ${mo};
      color: ${Ho};
      cursor: pointer;
      flex: 0 0 auto;
      fill: currentcolor;
      font-size: ${Ve};
      height: calc(${Fr} * 1px);
      line-height: ${Se};
      margin: 0 calc((${xe} - ${Ce}) * 1px);
      outline: none;
      overflow: hidden;
      padding: 0 1ch;
      user-select: none;
      white-space: nowrap;
    }

    :host(:not([disabled]):not([aria-selected='true']):hover) {
      background: ${vo};
    }

    :host(:not([disabled]):not([aria-selected='true']):active) {
      background: ${$o};
    }

    :host([aria-selected='true']) {
      background: ${It};
      color: ${qt};
    }

    :host(:not([disabled])[aria-selected='true']:hover) {
      background: ${At};
      color: ${Wt};
    }

    :host(:not([disabled])[aria-selected='true']:active) {
      background: ${Mt};
      color: ${Ut};
    }

    :host([disabled]) {
      cursor: ${q.disabledCursor};
      opacity: ${ke};
    }

    .content {
      grid-column-start: 2;
      justify-self: start;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .start,
    .end,
    ::slotted(svg) {
      display: flex;
    }

    ::slotted(svg) {
      /* TODO: adaptive typography https://github.com/microsoft/fast/issues/2432 */
      height: calc(${xe} * 4px);
      width: calc(${xe} * 4px);
    }

    ::slotted([slot='end']) {
      margin-inline-start: 1ch;
    }

    ::slotted([slot='start']) {
      margin-inline-end: 1ch;
    }

    :host([aria-checked='true'][aria-selected='false']) {
      border-color: ${To};
    }

    :host([aria-checked='true'][aria-selected='true']) {
      border-color: ${To};
      box-shadow: 0 0 0 calc(${Ce} * 2 * 1px) inset
        ${Bo};
    }
  `.withBehaviors((0,q.forcedColorsStylesheetBehavior)(yr.css`
      :host {
        border-color: transparent;
        forced-color-adjust: none;
        color: ${kr.ButtonText};
        fill: currentcolor;
      }

      :host(:not([aria-selected='true']):hover),
      :host([aria-selected='true']) {
        background: ${kr.Highlight};
        color: ${kr.HighlightText};
      }

      :host([disabled]),
      :host([disabled][aria-selected='false']:hover) {
        background: ${kr.Canvas};
        color: ${kr.GrayText};
        fill: currentcolor;
        opacity: 1;
      }

      :host([aria-checked='true'][aria-selected='false']) {
        background: ${kr.ButtonFace};
        color: ${kr.ButtonText};
        border-color: ${kr.ButtonText};
      }

      :host([aria-checked='true'][aria-selected='true']),
      :host([aria-checked='true'][aria-selected='true']:hover) {
        background: ${kr.Highlight};
        color: ${kr.HighlightText};
        border-color: ${kr.ButtonText};
      }
    `));class bi extends q.ListboxOption{}const fi=bi.compose({baseName:"option",baseClass:q.ListboxOption,template:q.listboxOptionTemplate,styles:gi}),mi=(e,t)=>yr.css`
    ${(0,q.display)("flex")} :host {
      align-items: center;
      outline: none;
      height: calc(${xe} * 1px);
      margin: calc(${xe} * 1px) 0;
    }

    .progress {
      background-color: ${lo};
      border-radius: calc(${xe} * 1px);
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      position: relative;
    }

    .determinate {
      background-color: ${to};
      border-radius: calc(${xe} * 1px);
      height: 100%;
      transition: all 0.2s ease-in-out;
      display: flex;
    }

    .indeterminate {
      height: 100%;
      border-radius: calc(${xe} * 1px);
      display: flex;
      width: 100%;
      position: relative;
      overflow: hidden;
    }

    .indeterminate-indicator-1 {
      position: absolute;
      opacity: 0;
      height: 100%;
      background-color: ${to};
      border-radius: calc(${xe} * 1px);
      animation-timing-function: cubic-bezier(0.4, 0, 0.6, 1);
      width: 40%;
      animation: indeterminate-1 2s infinite;
    }

    .indeterminate-indicator-2 {
      position: absolute;
      opacity: 0;
      height: 100%;
      background-color: ${to};
      border-radius: calc(${xe} * 1px);
      animation-timing-function: cubic-bezier(0.4, 0, 0.6, 1);
      width: 60%;
      animation: indeterminate-2 2s infinite;
    }

    :host([paused]) .indeterminate-indicator-1,
    :host([paused]) .indeterminate-indicator-2 {
      animation-play-state: paused;
      background-color: ${lo};
    }

    :host([paused]) .determinate {
      background-color: ${Lo};
    }

    @keyframes indeterminate-1 {
      0% {
        opacity: 1;
        transform: translateX(-100%);
      }
      70% {
        opacity: 1;
        transform: translateX(300%);
      }
      70.01% {
        opacity: 0;
      }
      100% {
        opacity: 0;
        transform: translateX(300%);
      }
    }

    @keyframes indeterminate-2 {
      0% {
        opacity: 0;
        transform: translateX(-150%);
      }
      29.99% {
        opacity: 0;
      }
      30% {
        opacity: 1;
        transform: translateX(-150%);
      }
      100% {
        transform: translateX(166.66%);
        opacity: 1;
      }
    }
  `.withBehaviors((0,q.forcedColorsStylesheetBehavior)(yr.css`
      .progress {
        forced-color-adjust: none;
        background-color: ${kr.Field};
        box-shadow: 0 0 0 1px inset ${kr.FieldText};
      }
      .determinate,
      .indeterminate-indicator-1,
      .indeterminate-indicator-2 {
        forced-color-adjust: none;
        background-color: ${kr.FieldText};
      }
      :host([paused]) .determinate,
      :host([paused]) .indeterminate-indicator-1,
      :host([paused]) .indeterminate-indicator-2 {
        background-color: ${kr.GrayText};
      }
    `));class vi extends q.BaseProgress{}const $i=vi.compose({baseName:"progress",baseClass:q.BaseProgress,template:q.progressTemplate,styles:mi,indeterminateIndicator1:'\n        <span class="indeterminate-indicator-1" part="indeterminate-indicator-1"></span>\n    ',indeterminateIndicator2:'\n        <span class="indeterminate-indicator-2" part="indeterminate-indicator-2"></span>\n    '}),xi=(e,t)=>yr.css`
    ${(0,q.display)("flex")} :host {
      align-items: center;
      outline: none;
      height: calc(${Fr} * 1px);
      width: calc(${Fr} * 1px);
      margin: calc(${Fr} * 1px) 0;
    }

    .progress {
      height: 100%;
      width: 100%;
    }

    .background {
      stroke: ${lo};
      fill: none;
      stroke-width: 2px;
    }

    .determinate {
      stroke: ${to};
      fill: none;
      stroke-width: 2px;
      stroke-linecap: round;
      transform-origin: 50% 50%;
      transform: rotate(-90deg);
      transition: all 0.2s ease-in-out;
    }

    .indeterminate-indicator-1 {
      stroke: ${to};
      fill: none;
      stroke-width: 2px;
      stroke-linecap: round;
      transform-origin: 50% 50%;
      transform: rotate(-90deg);
      transition: all 0.2s ease-in-out;
      animation: spin-infinite 2s linear infinite;
    }

    :host([paused]) .indeterminate-indicator-1 {
      animation-play-state: paused;
      stroke: ${lo};
    }

    :host([paused]) .determinate {
      stroke: ${Lo};
    }

    @keyframes spin-infinite {
      0% {
        stroke-dasharray: 0.01px 43.97px;
        transform: rotate(0deg);
      }
      50% {
        stroke-dasharray: 21.99px 21.99px;
        transform: rotate(450deg);
      }
      100% {
        stroke-dasharray: 0.01px 43.97px;
        transform: rotate(1080deg);
      }
    }
  `.withBehaviors((0,q.forcedColorsStylesheetBehavior)(yr.css`
      .indeterminate-indicator-1,
      .determinate {
        stroke: ${kr.FieldText};
      }
      .background {
        stroke: ${kr.Field};
      }
      :host([paused]) .indeterminate-indicator-1 {
        stroke: ${kr.Field};
      }
      :host([paused]) .determinate {
        stroke: ${kr.GrayText};
      }
    `));class yi extends q.BaseProgress{}const wi=yi.compose({baseName:"progress-ring",baseClass:q.BaseProgress,template:q.progressRingTemplate,styles:xi,indeterminateIndicator:'\n        <svg class="progress" part="progress" viewBox="0 0 16 16">\n            <circle\n                class="background"\n                part="background"\n                cx="8px"\n                cy="8px"\n                r="7px"\n            ></circle>\n            <circle\n                class="indeterminate-indicator-1"\n                part="indeterminate-indicator-1"\n                cx="8px"\n                cy="8px"\n                r="7px"\n            ></circle>\n        </svg>\n    '}),ki=(e,t)=>yr.css`
    ${(0,q.display)("inline-flex")} :host {
      --input-size: calc((${Fr} / 2) + ${xe});
      align-items: center;
      outline: none;
      margin: calc(${xe} * 1px) 0;
      /* Chromium likes to select label text or the default slot when
                the radio is clicked. Maybe there is a better solution here? */
      user-select: none;
      position: relative;
      flex-direction: row;
      transition: all 0.2s ease-in-out;
    }

    .control {
      position: relative;
      width: calc((${Fr} / 2 + ${xe}) * 1px);
      height: calc((${Fr} / 2 + ${xe}) * 1px);
      box-sizing: border-box;
      border-radius: 999px;
      border: calc(${Fe} * 1px) solid ${Ro};
      background: ${uo};
      outline: none;
      cursor: pointer;
    }

    :host([aria-invalid='true']) .control {
      border-color: ${Uo};
    }

    .label {
      font-family: ${ge};
      color: ${Ho};
      padding-inline-start: calc(${xe} * 2px + 2px);
      margin-inline-end: calc(${xe} * 2px + 2px);
      cursor: pointer;
      font-size: ${Ve};
      line-height: ${Se};
    }

    .label__hidden {
      display: none;
      visibility: hidden;
    }

    .control,
    .checked-indicator {
      flex-shrink: 0;
    }

    .checked-indicator {
      position: absolute;
      top: 5px;
      left: 5px;
      right: 5px;
      bottom: 5px;
      border-radius: 999px;
      display: inline-block;
      background: ${qt};
      fill: ${qt};
      opacity: 0;
      pointer-events: none;
    }

    :host(:not([disabled])) .control:hover {
      background: ${po};
      border-color: ${Po};
    }

    :host([aria-invalid='true']:not([disabled])) .control:hover {
      border-color: ${Xo};
    }

    :host(:not([disabled])) .control:active {
      background: ${go};
      border-color: ${Io};
    }

    :host([aria-invalid='true']:not([disabled])) .control:active {
      border-color: ${Yo};
    }

    :host(:${q.focusVisible}) .control {
      outline: solid calc(${Ce} * 1px) ${Gt};
    }

    :host([aria-invalid='true']:${q.focusVisible}) .control {
      outline-color: ${Zo};
    }

    :host([aria-checked='true']) .control {
      background: ${It};
      border: calc(${Fe} * 1px) solid ${It};
    }

    :host([aria-invalid='true'][aria-checked='true']) .control {
      background-color: ${Uo};
      border-color: ${Uo};
    }

    :host([aria-checked='true']:not([disabled])) .control:hover {
      background: ${At};
      border: calc(${Fe} * 1px) solid ${At};
    }

    :host([aria-invalid='true'][aria-checked='true']:not([disabled]))
      .control:hover {
      background-color: ${Xo};
      border-color: ${Xo};
    }

    :host([aria-checked='true']:not([disabled]))
      .control:hover
      .checked-indicator {
      background: ${Wt};
      fill: ${Wt};
    }

    :host([aria-checked='true']:not([disabled])) .control:active {
      background: ${Mt};
      border: calc(${Fe} * 1px) solid ${Mt};
    }

    :host([aria-invalid='true'][aria-checked='true']:not([disabled]))
      .control:active {
      background-color: ${Yo};
      border-color: ${Yo};
    }

    :host([aria-checked='true']:not([disabled]))
      .control:active
      .checked-indicator {
      background: ${Ut};
      fill: ${Ut};
    }

    :host([aria-checked="true"]:${q.focusVisible}:not([disabled])) .control {
      outline-offset: 2px;
      outline: solid calc(${Ce} * 1px) ${Gt};
    }

    :host([aria-invalid='true'][aria-checked="true"]:${q.focusVisible}:not([disabled])) .control {
      outline-color: ${Zo};
    }

    :host([disabled]) .label,
    :host([readonly]) .label,
    :host([readonly]) .control,
    :host([disabled]) .control {
      cursor: ${q.disabledCursor};
    }

    :host([aria-checked='true']) .checked-indicator {
      opacity: 1;
    }

    :host([disabled]) {
      opacity: ${ke};
    }
  `.withBehaviors((0,q.forcedColorsStylesheetBehavior)(yr.css`
      .control,
      :host([aria-checked='true']:not([disabled])) .control {
        forced-color-adjust: none;
        border-color: ${kr.FieldText};
        background: ${kr.Field};
      }
      :host([aria-invalid='true']) {
        border-style: dashed;
      }
      :host(:not([disabled])) .control:hover {
        border-color: ${kr.Highlight};
        background: ${kr.Field};
      }
      :host([aria-checked='true']:not([disabled])) .control:hover,
      :host([aria-checked='true']:not([disabled])) .control:active {
        border-color: ${kr.Highlight};
        background: ${kr.Highlight};
      }
      :host([aria-checked='true']) .checked-indicator {
        background: ${kr.Highlight};
        fill: ${kr.Highlight};
      }
      :host([aria-checked='true']:not([disabled]))
        .control:hover
        .checked-indicator,
      :host([aria-checked='true']:not([disabled]))
        .control:active
        .checked-indicator {
        background: ${kr.HighlightText};
        fill: ${kr.HighlightText};
      }
      :host(:${q.focusVisible}) .control {
        border-color: ${kr.Highlight};
        outline-offset: 2px;
        outline: solid calc(${Ce} * 1px) ${kr.FieldText};
      }
      :host([aria-checked="true"]:${q.focusVisible}:not([disabled])) .control {
        border-color: ${kr.Highlight};
        outline: solid calc(${Ce} * 1px) ${kr.FieldText};
      }
      :host([disabled]) {
        forced-color-adjust: none;
        opacity: 1;
      }
      :host([disabled]) .label {
        color: ${kr.GrayText};
      }
      :host([disabled]) .control,
      :host([aria-checked='true'][disabled]) .control:hover,
      .control:active {
        background: ${kr.Field};
        border-color: ${kr.GrayText};
      }
      :host([disabled]) .checked-indicator,
      :host([aria-checked='true'][disabled]) .control:hover .checked-indicator {
        fill: ${kr.GrayText};
        background: ${kr.GrayText};
      }
    `)),Fi=(e,t)=>yr.html`
  <template
    role="radio"
    aria-checked="${e=>e.checked}"
    aria-required="${e=>e.required}"
    aria-disabled="${e=>e.disabled}"
    aria-readonly="${e=>e.readOnly}"
    @keypress="${(e,t)=>e.keypressHandler(t.event)}"
    @click="${(e,t)=>e.clickHandler(t.event)}"
  >
    <div part="control" class="control">
      <slot name="checked-indicator">
        ${t.checkedIndicator||""}
      </slot>
    </div>
    <label
      part="label"
      class="${e=>e.defaultSlottedNodes&&e.defaultSlottedNodes.length?"label":"label label__hidden"}"
    >
      <slot ${(0,yr.slotted)("defaultSlottedNodes")}></slot>
    </label>
  </template>
`;class Ci extends q.Radio{}const Vi=Ci.compose({baseName:"radio",baseClass:q.Radio,template:Fi,styles:ki,checkedIndicator:'\n        <div part="checked-indicator" class="checked-indicator"></div>\n    '}),Si=(e,t)=>yr.css`
  ${(0,q.display)("flex")} :host {
    align-items: flex-start;
    margin: calc(${xe} * 1px) 0;
    flex-direction: column;
  }
  .positioning-region {
    display: flex;
    flex-wrap: wrap;
  }
  :host([orientation='vertical']) .positioning-region {
    flex-direction: column;
  }
  :host([orientation='horizontal']) .positioning-region {
    flex-direction: row;
  }
`;class Di extends q.RadioGroup{constructor(){super();const e={handleChange(e,t){"slottedRadioButtons"===t&&e.ariaInvalidChanged()}};yr.Observable.getNotifier(this).subscribe(e,"slottedRadioButtons")}ariaInvalidChanged(){this.slottedRadioButtons&&this.slottedRadioButtons.forEach((e=>{var t;e.setAttribute("aria-invalid",null!==(t=this.getAttribute("aria-invalid"))&&void 0!==t?t:"false")}))}}const Ti=Di.compose({baseName:"radio-group",baseClass:q.RadioGroup,template:q.radioGroupTemplate,styles:Si}),zi=q.DesignToken.create("clear-button-hover").withDefault((e=>{const t=fo.getValueFor(e),o=io.getValueFor(e);return t.evaluate(e,o.evaluate(e).hover).hover})),Bi=q.DesignToken.create("clear-button-active").withDefault((e=>{const t=fo.getValueFor(e),o=io.getValueFor(e);return t.evaluate(e,o.evaluate(e).hover).active})),ji=(e,t)=>yr.css`
  ${Ra}

  .control::-webkit-search-cancel-button {
    -webkit-appearance: none;
  }

  .control:hover,
    .control:${q.focusVisible},
    .control:disabled,
    .control:active {
    outline: none;
  }

  .clear-button {
    height: calc(100% - 2px);
    opacity: 0;
    margin: 1px;
    background: transparent;
    color: ${Ho};
    fill: currentcolor;
    border: none;
    border-radius: calc(${ve} * 1px);
    min-width: calc(${Fr} * 1px);
    font-size: ${Ve};
    line-height: ${Se};
    outline: none;
    font-family: ${ge};
    padding: 0 calc((10 + (${xe} * 2 * ${$e})) * 1px);
  }

  .clear-button:hover {
    background: ${vo};
  }

  .clear-button:active {
    background: ${$o};
  }

  :host([appearance='filled']) .clear-button:hover {
    background: ${zi};
  }

  :host([appearance='filled']) .clear-button:active {
    background: ${Bi};
  }

  .input-wrapper {
    display: flex;
    position: relative;
    width: 100%;
  }

  .start,
  .end {
    display: flex;
    margin: 1px;
    fill: currentcolor;
  }

  ::slotted([slot='end']) {
    height: 100%;
  }

  .end {
    margin-inline-end: 1px;
    height: calc(100% - 2px);
  }

  ::slotted(svg) {
    /* TODO: adaptive typography https://github.com/microsoft/fast/issues/2432 */
    width: 16px;
    height: 16px;
    margin-inline-end: 11px;
    margin-inline-start: 11px;
    margin-top: auto;
    margin-bottom: auto;
  }

  .clear-button__hidden {
    opacity: 0;
  }

  :host(:hover:not([disabled], [readOnly])) .clear-button,
  :host(:active:not([disabled], [readOnly])) .clear-button,
  :host(:focus-within:not([disabled], [readOnly])) .clear-button {
    opacity: 1;
  }

  :host(:hover:not([disabled], [readOnly])) .clear-button__hidden,
  :host(:active:not([disabled], [readOnly])) .clear-button__hidden,
  :host(:focus-within:not([disabled], [readOnly])) .clear-button__hidden {
    opacity: 0;
  }
`;class Li extends q.Search{constructor(){super(...arguments),this.appearance="outline"}}zr([yr.attr],Li.prototype,"appearance",void 0);const Ni=Li.compose({baseName:"search",baseClass:q.Search,template:q.searchTemplate,styles:ji,shadowOptions:{delegatesFocus:!0}});class Hi extends q.Select{constructor(){super(...arguments),this.listboxScrollWidth=""}autoWidthChanged(e,t){t?this.setAutoWidth():this.style.removeProperty("width")}setAutoWidth(){if(!this.autoWidth||!this.isConnected)return;let e=this.listbox.getBoundingClientRect().width;0===e&&this.listbox.hidden&&(Object.assign(this.listbox.style,{visibility:"hidden"}),this.listbox.removeAttribute("hidden"),e=this.listbox.getBoundingClientRect().width,this.listbox.setAttribute("hidden",""),this.listbox.style.removeProperty("visibility")),e>0&&Object.assign(this.style,{width:`${e}px`})}connectedCallback(){super.connectedCallback(),this.setAutoWidth(),this.listbox&&Ot.setValueFor(this.listbox,St)}slottedOptionsChanged(e,t){super.slottedOptionsChanged(e,t),this.setAutoWidth()}get listboxMaxHeight(){return Math.floor(this.maxHeight/Eo.getValueFor(this)).toString()}listboxScrollWidthChanged(){this.updateComputedStylesheet()}get selectSize(){var e;return`${null!==(e=this.size)&&void 0!==e?e:this.multiple?4:0}`}multipleChanged(e,t){super.multipleChanged(e,t),this.updateComputedStylesheet()}maxHeightChanged(e,t){this.collapsible&&this.updateComputedStylesheet()}setPositioning(){super.setPositioning(),this.updateComputedStylesheet()}sizeChanged(e,t){super.sizeChanged(e,t),this.updateComputedStylesheet(),this.collapsible?requestAnimationFrame((()=>{this.listbox.style.setProperty("display","flex"),this.listbox.style.setProperty("overflow","visible"),this.listbox.style.setProperty("visibility","hidden"),this.listbox.style.setProperty("width","auto"),this.listbox.hidden=!1,this.listboxScrollWidth=`${this.listbox.scrollWidth}`,this.listbox.hidden=!0,this.listbox.style.removeProperty("display"),this.listbox.style.removeProperty("overflow"),this.listbox.style.removeProperty("visibility"),this.listbox.style.removeProperty("width")})):this.listboxScrollWidth=""}updateComputedStylesheet(){this.computedStylesheet&&this.$fastController.removeStyles(this.computedStylesheet),this.computedStylesheet=yr.css`
      :host {
        --listbox-max-height: ${this.listboxMaxHeight};
        --listbox-scroll-width: ${this.listboxScrollWidth};
        --size: ${this.selectSize};
      }
    `,this.$fastController.addStyles(this.computedStylesheet)}}zr([(0,yr.attr)({attribute:"autowidth",mode:"boolean"})],Hi.prototype,"autoWidth",void 0),zr([(0,yr.attr)({attribute:"minimal",mode:"boolean"})],Hi.prototype,"minimal",void 0),zr([yr.attr],Hi.prototype,"scale",void 0),zr([yr.observable],Hi.prototype,"listboxScrollWidth",void 0);const Oi=Hi.compose({baseName:"select",baseClass:q.Select,template:q.selectTemplate,styles:va,indicator:'\n        <svg\n            class="select-indicator"\n            part="select-indicator"\n            viewBox="0 0 12 7"\n            xmlns="http://www.w3.org/2000/svg"\n        >\n            <path\n                d="M11.85.65c.2.2.2.5 0 .7L6.4 6.84a.55.55 0 01-.78 0L.14 1.35a.5.5 0 11.71-.7L6 5.8 11.15.65c.2-.2.5-.2.7 0z"\n            />\n        </svg>\n    '}),Ri=(e,t)=>yr.css`
    ${(0,q.display)("block")} :host {
      --skeleton-fill-default: #e1dfdd;
      overflow: hidden;
      width: 100%;
      position: relative;
      background-color: var(--skeleton-fill, var(--skeleton-fill-default));
      --skeleton-animation-gradient-default: linear-gradient(
        270deg,
        var(--skeleton-fill, var(--skeleton-fill-default)) 0%,
        #f3f2f1 51.13%,
        var(--skeleton-fill, var(--skeleton-fill-default)) 100%
      );
      --skeleton-animation-timing-default: ease-in-out;
    }

    :host([shape='rect']) {
      border-radius: calc(${ve} * 1px);
    }

    :host([shape='circle']) {
      border-radius: 100%;
      overflow: hidden;
    }

    object {
      position: absolute;
      width: 100%;
      height: auto;
      z-index: 2;
    }

    object img {
      width: 100%;
      height: auto;
    }

    ${(0,q.display)("block")} span.shimmer {
      position: absolute;
      width: 100%;
      height: 100%;
      background-image: var(
        --skeleton-animation-gradient,
        var(--skeleton-animation-gradient-default)
      );
      background-size: 0px 0px / 90% 100%;
      background-repeat: no-repeat;
      background-color: var(--skeleton-animation-fill, ${lo});
      animation: shimmer 2s infinite;
      animation-timing-function: var(
        --skeleton-animation-timing,
        var(--skeleton-timing-default)
      );
      animation-direction: normal;
      z-index: 1;
    }

    ::slotted(svg) {
      z-index: 2;
    }

    ::slotted(.pattern) {
      width: 100%;
      height: 100%;
    }

    @keyframes shimmer {
      0% {
        transform: translateX(-100%);
      }
      100% {
        transform: translateX(100%);
      }
    }
  `.withBehaviors((0,q.forcedColorsStylesheetBehavior)(yr.css`
      :host {
        forced-color-adjust: none;
        background-color: ${kr.ButtonFace};
        box-shadow: 0 0 0 1px ${kr.ButtonText};
      }

      ${(0,q.display)("block")} span.shimmer {
        display: none;
      }
    `));class Pi extends q.Skeleton{}const Ii=Pi.compose({baseName:"skeleton",baseClass:q.Skeleton,template:q.skeletonTemplate,styles:Ri}),Ai=yr.css`
  .track-start {
    left: 0;
  }
`,Mi=yr.css`
  .track-start {
    right: 0;
  }
`,Gi=(e,t)=>yr.css`
    :host([hidden]) {
      display: none;
    }

    ${(0,q.display)("inline-grid")} :host {
      --thumb-size: calc(${Fr} * 0.5 - ${xe});
      --thumb-translate: calc(
        var(--thumb-size) * -0.5 + var(--track-width) / 2
      );
      --track-overhang: calc((${xe} / 2) * -1);
      --track-width: ${xe};
      --jp-slider-height: calc(var(--thumb-size) * 10);
      align-items: center;
      width: 100%;
      margin: calc(${xe} * 1px) 0;
      user-select: none;
      box-sizing: border-box;
      border-radius: calc(${ve} * 1px);
      outline: none;
      cursor: pointer;
    }
    :host([orientation='horizontal']) .positioning-region {
      position: relative;
      margin: 0 8px;
      display: grid;
      grid-template-rows: calc(var(--thumb-size) * 1px) 1fr;
    }
    :host([orientation='vertical']) .positioning-region {
      position: relative;
      margin: 0 8px;
      display: grid;
      height: 100%;
      grid-template-columns: calc(var(--thumb-size) * 1px) 1fr;
    }

    :host(:${q.focusVisible}) .thumb-cursor {
      box-shadow:
        0 0 0 2px ${Ot},
        0 0 0 calc((2 + ${Ce}) * 1px) ${Gt};
    }

    :host([aria-invalid='true']:${q.focusVisible}) .thumb-cursor {
      box-shadow:
        0 0 0 2px ${Ot},
        0 0 0 calc((2 + ${Ce}) * 1px) ${Zo};
    }

    .thumb-container {
      position: absolute;
      height: calc(var(--thumb-size) * 1px);
      width: calc(var(--thumb-size) * 1px);
      transition: all 0.2s ease;
      color: ${Ho};
      fill: currentcolor;
    }
    .thumb-cursor {
      border: none;
      width: calc(var(--thumb-size) * 1px);
      height: calc(var(--thumb-size) * 1px);
      background: ${Ho};
      border-radius: calc(${ve} * 1px);
    }
    .thumb-cursor:hover {
      background: ${Ho};
      border-color: ${Po};
    }
    .thumb-cursor:active {
      background: ${Ho};
    }
    .track-start {
      background: ${to};
      position: absolute;
      height: 100%;
      left: 0;
      border-radius: calc(${ve} * 1px);
    }
    :host([aria-invalid='true']) .track-start {
      background-color: ${Uo};
    }
    :host([orientation='horizontal']) .thumb-container {
      transform: translateX(calc(var(--thumb-size) * 0.5px))
        translateY(calc(var(--thumb-translate) * 1px));
    }
    :host([orientation='vertical']) .thumb-container {
      transform: translateX(calc(var(--thumb-translate) * 1px))
        translateY(calc(var(--thumb-size) * 0.5px));
    }
    :host([orientation='horizontal']) {
      min-width: calc(var(--thumb-size) * 1px);
    }
    :host([orientation='horizontal']) .track {
      right: calc(var(--track-overhang) * 1px);
      left: calc(var(--track-overhang) * 1px);
      align-self: start;
      height: calc(var(--track-width) * 1px);
    }
    :host([orientation='vertical']) .track {
      top: calc(var(--track-overhang) * 1px);
      bottom: calc(var(--track-overhang) * 1px);
      width: calc(var(--track-width) * 1px);
      height: 100%;
    }
    .track {
      background: ${Ro};
      position: absolute;
      border-radius: calc(${ve} * 1px);
    }
    :host([orientation='vertical']) {
      height: calc(var(--fast-slider-height) * 1px);
      min-height: calc(var(--thumb-size) * 1px);
      min-width: calc(${xe} * 20px);
    }
    :host([orientation='vertical']) .track-start {
      height: auto;
      width: 100%;
      top: 0;
    }
    :host([disabled]),
    :host([readonly]) {
      cursor: ${q.disabledCursor};
    }
    :host([disabled]) {
      opacity: ${ke};
    }
  `.withBehaviors(new qr(Ai,Mi),(0,q.forcedColorsStylesheetBehavior)(yr.css`
      .thumb-cursor {
        forced-color-adjust: none;
        border-color: ${kr.FieldText};
        background: ${kr.FieldText};
      }
      .thumb-cursor:hover,
      .thumb-cursor:active {
        background: ${kr.Highlight};
      }
      .track {
        forced-color-adjust: none;
        background: ${kr.FieldText};
      }
      :host(:${q.focusVisible}) .thumb-cursor {
        border-color: ${kr.Highlight};
      }
      :host([disabled]) {
        opacity: 1;
      }
      :host([disabled]) .track,
      :host([disabled]) .thumb-cursor {
        forced-color-adjust: none;
        background: ${kr.GrayText};
      }

      :host(:${q.focusVisible}) .thumb-cursor {
        background: ${kr.Highlight};
        border-color: ${kr.Highlight};
        box-shadow:
          0 0 0 2px ${kr.Field},
          0 0 0 4px ${kr.FieldText};
      }
    `));class Ei extends q.Slider{}const _i=Ei.compose({baseName:"slider",baseClass:q.Slider,template:q.sliderTemplate,styles:Gi,thumb:'\n        <div class="thumb-cursor"></div>\n    '});var qi=o(27089);const Wi=yr.css`
  :host {
    align-self: start;
    grid-row: 2;
    margin-top: -2px;
    height: calc((${Fr} / 2 + ${xe}) * 1px);
    width: auto;
  }
  .container {
    grid-template-rows: auto auto;
    grid-template-columns: 0;
  }
  .label {
    margin: 2px 0;
  }
`,Ui=yr.css`
  :host {
    justify-self: start;
    grid-column: 2;
    margin-left: 2px;
    height: auto;
    width: calc((${Fr} / 2 + ${xe}) * 1px);
  }
  .container {
    grid-template-columns: auto auto;
    grid-template-rows: 0;
    min-width: calc(var(--thumb-size) * 1px);
    height: calc(var(--thumb-size) * 1px);
  }
  .mark {
    transform: rotate(90deg);
    align-self: center;
  }
  .label {
    margin-left: calc((${xe} / 2) * 3px);
    align-self: center;
  }
`,Xi=(e,t)=>yr.css`
    ${(0,q.display)("block")} :host {
      font-family: ${ge};
      color: ${Ho};
      fill: currentcolor;
    }
    .root {
      position: absolute;
      display: grid;
    }
    .container {
      display: grid;
      justify-self: center;
    }
    .label {
      justify-self: center;
      align-self: center;
      white-space: nowrap;
      max-width: 30px;
    }
    .mark {
      width: calc((${xe} / 4) * 1px);
      height: calc(${Fr} * 0.25 * 1px);
      background: ${Ro};
      justify-self: center;
    }
    :host(.disabled) {
      opacity: ${ke};
    }
  `.withBehaviors((0,q.forcedColorsStylesheetBehavior)(yr.css`
      .mark {
        forced-color-adjust: none;
        background: ${kr.FieldText};
      }
      :host(.disabled) {
        forced-color-adjust: none;
        opacity: 1;
      }
      :host(.disabled) .label {
        color: ${kr.GrayText};
      }
      :host(.disabled) .mark {
        background: ${kr.GrayText};
      }
    `));class Yi extends q.SliderLabel{sliderOrientationChanged(){this.sliderOrientation===qi.i.horizontal?(this.$fastController.addStyles(Wi),this.$fastController.removeStyles(Ui)):(this.$fastController.addStyles(Ui),this.$fastController.removeStyles(Wi))}}const Zi=Yi.compose({baseName:"slider-label",baseClass:q.SliderLabel,template:q.sliderLabelTemplate,styles:Xi}),Ji=(e,t)=>yr.css`
    :host([hidden]) {
      display: none;
    }

    ${(0,q.display)("inline-flex")} :host {
      align-items: center;
      outline: none;
      font-family: ${ge};
      margin: calc(${xe} * 1px) 0;
      ${""} user-select: none;
    }

    :host([disabled]) {
      opacity: ${ke};
    }

    :host([disabled]) .label,
    :host([readonly]) .label,
    :host([readonly]) .switch,
    :host([disabled]) .switch {
      cursor: ${q.disabledCursor};
    }

    .switch {
      position: relative;
      outline: none;
      box-sizing: border-box;
      width: calc(${Fr} * 1px);
      height: calc((${Fr} / 2 + ${xe}) * 1px);
      background: ${uo};
      border-radius: calc(${ve} * 1px);
      border: calc(${Fe} * 1px) solid ${Ro};
    }

    :host([aria-invalid='true']) .switch {
      border-color: ${Uo};
    }

    .switch:hover {
      background: ${po};
      border-color: ${Po};
      cursor: pointer;
    }

    :host([disabled]) .switch:hover,
    :host([readonly]) .switch:hover {
      background: ${po};
      border-color: ${Po};
      cursor: ${q.disabledCursor};
    }

    :host([aria-invalid='true'][disabled]) .switch:hover,
    :host([aria-invalid='true'][readonly]) .switch:hover {
      border-color: ${Xo};
    }

    :host(:not([disabled])) .switch:active {
      background: ${go};
      border-color: ${Io};
    }

    :host([aria-invalid='true']:not([disabled])) .switch:active {
      border-color: ${Yo};
    }

    :host(:${q.focusVisible}) .switch {
      outline-offset: 2px;
      outline: solid calc(${Ce} * 1px) ${Gt};
    }

    :host([aria-invalid='true']:${q.focusVisible}) .switch {
      outline-color: ${Zo};
    }

    .checked-indicator {
      position: absolute;
      top: 5px;
      bottom: 5px;
      background: ${Ho};
      border-radius: calc(${ve} * 1px);
      transition: all 0.2s ease-in-out;
    }

    .status-message {
      color: ${Ho};
      cursor: pointer;
      font-size: ${Ve};
      line-height: ${Se};
    }

    :host([disabled]) .status-message,
    :host([readonly]) .status-message {
      cursor: ${q.disabledCursor};
    }

    .label {
      color: ${Ho};
      margin-inline-end: calc(${xe} * 2px + 2px);
      font-size: ${Ve};
      line-height: ${Se};
      cursor: pointer;
    }

    .label__hidden {
      display: none;
      visibility: hidden;
    }

    ::slotted([slot='checked-message']),
    ::slotted([slot='unchecked-message']) {
      margin-inline-start: calc(${xe} * 2px + 2px);
    }

    :host([aria-checked='true']) .checked-indicator {
      background: ${qt};
    }

    :host([aria-checked='true']) .switch {
      background: ${It};
      border-color: ${It};
    }

    :host([aria-checked='true']:not([disabled])) .switch:hover {
      background: ${At};
      border-color: ${At};
    }

    :host([aria-invalid='true'][aria-checked='true']) .switch {
      background-color: ${Uo};
      border-color: ${Uo};
    }

    :host([aria-invalid='true'][aria-checked='true']:not([disabled]))
      .switch:hover {
      background-color: ${Xo};
      border-color: ${Xo};
    }

    :host([aria-checked='true']:not([disabled]))
      .switch:hover
      .checked-indicator {
      background: ${Wt};
    }

    :host([aria-checked='true']:not([disabled])) .switch:active {
      background: ${Mt};
      border-color: ${Mt};
    }

    :host([aria-invalid='true'][aria-checked='true']:not([disabled]))
      .switch:active {
      background-color: ${Yo};
      border-color: ${Yo};
    }

    :host([aria-checked='true']:not([disabled]))
      .switch:active
      .checked-indicator {
      background: ${Ut};
    }

    :host([aria-checked="true"]:${q.focusVisible}:not([disabled])) .switch {
      outline: solid calc(${Ce} * 1px) ${Gt};
    }

    :host([aria-invalid='true'][aria-checked="true"]:${q.focusVisible}:not([disabled])) .switch {
      outline-color: ${Zo};
    }

    .unchecked-message {
      display: block;
    }

    .checked-message {
      display: none;
    }

    :host([aria-checked='true']) .unchecked-message {
      display: none;
    }

    :host([aria-checked='true']) .checked-message {
      display: block;
    }
  `.withBehaviors((0,q.forcedColorsStylesheetBehavior)(yr.css`
      .checked-indicator,
      :host(:not([disabled])) .switch:active .checked-indicator {
        forced-color-adjust: none;
        background: ${kr.FieldText};
      }
      .switch {
        forced-color-adjust: none;
        background: ${kr.Field};
        border-color: ${kr.FieldText};
      }
      :host([aria-invalid='true']) .switch {
        border-style: dashed;
      }
      :host(:not([disabled])) .switch:hover {
        background: ${kr.HighlightText};
        border-color: ${kr.Highlight};
      }
      :host([aria-checked='true']) .switch {
        background: ${kr.Highlight};
        border-color: ${kr.Highlight};
      }
      :host([aria-checked='true']:not([disabled])) .switch:hover,
      :host(:not([disabled])) .switch:active {
        background: ${kr.HighlightText};
        border-color: ${kr.Highlight};
      }
      :host([aria-checked='true']) .checked-indicator {
        background: ${kr.HighlightText};
      }
      :host([aria-checked='true']:not([disabled]))
        .switch:hover
        .checked-indicator {
        background: ${kr.Highlight};
      }
      :host([disabled]) {
        opacity: 1;
      }
      :host(:${q.focusVisible}) .switch {
        border-color: ${kr.Highlight};
        outline-offset: 2px;
        outline: solid calc(${Ce} * 1px) ${kr.FieldText};
      }
      :host([aria-checked="true"]:${q.focusVisible}:not([disabled])) .switch {
        outline: solid calc(${Ce} * 1px) ${kr.FieldText};
      }
      :host([disabled]) .checked-indicator {
        background: ${kr.GrayText};
      }
      :host([disabled]) .switch {
        background: ${kr.Field};
        border-color: ${kr.GrayText};
      }
    `),new qr(yr.css`
        .checked-indicator {
          left: 5px;
          right: calc(((${Fr} / 2) + 1) * 1px);
        }

        :host([aria-checked='true']) .checked-indicator {
          left: calc(((${Fr} / 2) + 1) * 1px);
          right: 5px;
        }
      `,yr.css`
        .checked-indicator {
          right: 5px;
          left: calc(((${Fr} / 2) + 1) * 1px);
        }

        :host([aria-checked='true']) .checked-indicator {
          right: calc(((${Fr} / 2) + 1) * 1px);
          left: 5px;
        }
      `));class Ki extends q.Switch{}const Qi=Ki.compose({baseName:"switch",baseClass:q.Switch,template:q.switchTemplate,styles:Ji,switch:'\n        <span class="checked-indicator" part="checked-indicator"></span>\n    '}),el=(e,t)=>yr.css`
  ${(0,q.display)("block")} :host {
    box-sizing: border-box;
    font-size: ${Ve};
    line-height: ${Se};
    padding: 0 calc((6 + (${xe} * 2 * ${$e})) * 1px);
  }
`;class tl extends q.TabPanel{}const ol=tl.compose({baseName:"tab-panel",baseClass:q.TabPanel,template:q.tabPanelTemplate,styles:el}),rl=(e,t)=>yr.css`
    ${(0,q.display)("inline-flex")} :host {
      box-sizing: border-box;
      font-family: ${ge};
      font-size: ${Ve};
      line-height: ${Se};
      height: calc(${Fr} * 1px);
      padding: calc(${xe} * 5px) calc(${xe} * 4px);
      color: ${Lo};
      fill: currentcolor;
      border-radius: 0 0 calc(${ve} * 1px)
        calc(${ve} * 1px);
      border: calc(${Fe} * 1px) solid transparent;
      align-items: center;
      justify-content: center;
      grid-row: 2;
      cursor: pointer;
    }

    :host(:hover) {
      color: ${Ho};
      fill: currentcolor;
    }

    :host(:active) {
      color: ${Ho};
      fill: currentcolor;
    }

    :host([disabled]) {
      cursor: ${q.disabledCursor};
      opacity: ${ke};
    }

    :host([disabled]:hover) {
      color: ${Lo};
      background: ${mo};
    }

    :host([aria-selected='true']) {
      background: ${lo};
      color: ${Ho};
      fill: currentcolor;
    }

    :host([aria-selected='true']:hover) {
      background: ${no};
      color: ${Ho};
      fill: currentcolor;
    }

    :host([aria-selected='true']:active) {
      background: ${so};
      color: ${Ho};
      fill: currentcolor;
    }

    :host(:${q.focusVisible}) {
      outline: none;
      border-color: ${Gt};
      box-shadow: 0 0 0 calc((${Ce} - ${Fe}) * 1px)
        ${Gt};
    }

    :host(:focus) {
      outline: none;
    }

    :host(.vertical) {
      justify-content: end;
      grid-column: 2;
      border-bottom-left-radius: 0;
      border-top-right-radius: calc(${ve} * 1px);
    }

    :host(.vertical[aria-selected='true']) {
      z-index: 2;
    }

    :host(.vertical:hover) {
      color: ${Ho};
    }

    :host(.vertical:active) {
      color: ${Ho};
    }

    :host(.vertical:hover[aria-selected='true']) {
    }
  `.withBehaviors((0,q.forcedColorsStylesheetBehavior)(yr.css`
      :host {
        forced-color-adjust: none;
        border-color: transparent;
        color: ${kr.ButtonText};
        fill: currentcolor;
      }
      :host(:hover),
      :host(.vertical:hover),
      :host([aria-selected='true']:hover) {
        background: ${kr.Highlight};
        color: ${kr.HighlightText};
        fill: currentcolor;
      }
      :host([aria-selected='true']) {
        background: ${kr.HighlightText};
        color: ${kr.Highlight};
        fill: currentcolor;
      }
      :host(:${q.focusVisible}) {
        border-color: ${kr.ButtonText};
        box-shadow: none;
      }
      :host([disabled]),
      :host([disabled]:hover) {
        opacity: 1;
        color: ${kr.GrayText};
        background: ${kr.ButtonFace};
      }
    `));class al extends q.Tab{}const il=al.compose({baseName:"tab",baseClass:q.Tab,template:q.tabTemplate,styles:rl}),ll=(e,t)=>yr.css`
    ${(0,q.display)("grid")} :host {
      box-sizing: border-box;
      font-family: ${ge};
      font-size: ${Ve};
      line-height: ${Se};
      color: ${Ho};
      grid-template-columns: auto 1fr auto;
      grid-template-rows: auto 1fr;
    }

    .tablist {
      display: grid;
      grid-template-rows: auto auto;
      grid-template-columns: auto;
      position: relative;
      width: max-content;
      align-self: end;
      padding: calc(${xe} * 4px) calc(${xe} * 4px) 0;
      box-sizing: border-box;
    }

    .start,
    .end {
      align-self: center;
    }

    .activeIndicator {
      grid-row: 1;
      grid-column: 1;
      width: 100%;
      height: 4px;
      justify-self: center;
      background: ${It};
      margin-top: 0;
      border-radius: calc(${ve} * 1px)
        calc(${ve} * 1px) 0 0;
    }

    .activeIndicatorTransition {
      transition: transform 0.01s ease-in-out;
    }

    .tabpanel {
      grid-row: 2;
      grid-column-start: 1;
      grid-column-end: 4;
      position: relative;
    }

    :host([orientation='vertical']) {
      grid-template-rows: auto 1fr auto;
      grid-template-columns: auto 1fr;
    }

    :host([orientation='vertical']) .tablist {
      grid-row-start: 2;
      grid-row-end: 2;
      display: grid;
      grid-template-rows: auto;
      grid-template-columns: auto 1fr;
      position: relative;
      width: max-content;
      justify-self: end;
      align-self: flex-start;
      width: 100%;
      padding: 0 calc(${xe} * 4px)
        calc((${Fr} - ${xe}) * 1px) 0;
    }

    :host([orientation='vertical']) .tabpanel {
      grid-column: 2;
      grid-row-start: 1;
      grid-row-end: 4;
    }

    :host([orientation='vertical']) .end {
      grid-row: 3;
    }

    :host([orientation='vertical']) .activeIndicator {
      grid-column: 1;
      grid-row: 1;
      width: 4px;
      height: 100%;
      margin-inline-end: 0px;
      align-self: center;
      background: ${It};
      border-radius: calc(${ve} * 1px) 0 0
        calc(${ve} * 1px);
    }

    :host([orientation='vertical']) .activeIndicatorTransition {
      transition: transform 0.01s ease-in-out;
    }
  `.withBehaviors((0,q.forcedColorsStylesheetBehavior)(yr.css`
      .activeIndicator,
      :host([orientation='vertical']) .activeIndicator {
        forced-color-adjust: none;
        background: ${kr.Highlight};
      }
    `));class nl extends q.Tabs{}const sl=nl.compose({baseName:"tabs",baseClass:q.Tabs,template:q.tabsTemplate,styles:ll}),cl=(e,t)=>yr.css`
    ${(0,q.display)("inline-block")} :host {
      font-family: ${ge};
      outline: none;
      user-select: none;
    }

    .control {
      box-sizing: border-box;
      position: relative;
      color: ${Ho};
      background: ${uo};
      border-radius: calc(${ve} * 1px);
      border: calc(${Fe} * 1px) solid ${wo};
      height: calc(${Fr} * 2px);
      font: inherit;
      font-size: ${Ve};
      line-height: ${Se};
      padding: calc(${xe} * 2px + 1px);
      width: 100%;
      resize: none;
    }

    :host([aria-invalid='true']) .control {
      border-color: ${Uo};
    }

    .control:hover:enabled {
      background: ${po};
      border-color: ${ko};
    }

    :host([aria-invalid='true']) .control:hover:enabled {
      border-color: ${Xo};
    }

    .control:active:enabled {
      background: ${go};
      border-color: ${Fo};
    }

    :host([aria-invalid='true']) .control:active:enabled {
      border-color: ${Yo};
    }

    .control:hover,
    .control:${q.focusVisible},
    .control:disabled,
    .control:active {
      outline: none;
    }

    :host(:focus-within) .control {
      border-color: ${Gt};
      box-shadow: 0 0 0 calc((${Ce} - ${Fe}) * 1px)
        ${Gt};
    }

    :host([aria-invalid='true']:focus-within) .control {
      border-color: ${Zo};
      box-shadow: 0 0 0 calc((${Ce} - ${Fe}) * 1px)
        ${Zo};
    }

    :host([appearance='filled']) .control {
      background: ${lo};
    }

    :host([appearance='filled']:hover:not([disabled])) .control {
      background: ${no};
    }

    :host([resize='both']) .control {
      resize: both;
    }

    :host([resize='horizontal']) .control {
      resize: horizontal;
    }

    :host([resize='vertical']) .control {
      resize: vertical;
    }

    .label {
      display: block;
      color: ${Ho};
      cursor: pointer;
      font-size: ${Ve};
      line-height: ${Se};
      margin-bottom: 4px;
    }

    .label__hidden {
      display: none;
      visibility: hidden;
    }

    :host([disabled]) .label,
    :host([readonly]) .label,
    :host([readonly]) .control,
    :host([disabled]) .control {
      cursor: ${q.disabledCursor};
    }
    :host([disabled]) {
      opacity: ${ke};
    }
    :host([disabled]) .control {
      border-color: ${Ro};
    }

    :host([cols]) {
      width: initial;
    }

    :host([rows]) .control {
      height: initial;
    }
  `.withBehaviors((0,q.forcedColorsStylesheetBehavior)(yr.css`
      :host([disabled]) {
        opacity: 1;
      }

      :host([aria-invalid='true']) .control {
        border-style: dashed;
      }
    `));class dl extends q.TextArea{constructor(){super(...arguments),this.appearance="outline"}}zr([yr.attr],dl.prototype,"appearance",void 0);const hl=dl.compose({baseName:"text-area",baseClass:q.TextArea,template:q.textAreaTemplate,styles:cl,shadowOptions:{delegatesFocus:!0}}),ul=(e,t)=>yr.css`
  ${Ra}

  .start,
    .end {
    display: flex;
  }
`;class pl extends q.TextField{constructor(){super(...arguments),this.appearance="outline"}}zr([yr.attr],pl.prototype,"appearance",void 0);const gl=pl.compose({baseName:"text-field",baseClass:q.TextField,template:q.textFieldTemplate,styles:ul,shadowOptions:{delegatesFocus:!0}});var bl=o(34550),fl=o(54598);const ml=(e,t)=>yr.css`
    ${(0,q.display)("inline-flex")} :host {
      --toolbar-item-gap: calc(
        (var(--design-unit) + calc(var(--density) + 2)) * 1px
      );
      background-color: ${Ot};
      border-radius: calc(${ve} * 1px);
      fill: currentcolor;
      padding: var(--toolbar-item-gap);
    }

    :host(${q.focusVisible}) {
      outline: calc(${Fe} * 1px) solid ${Gt};
    }

    .positioning-region {
      align-items: flex-start;
      display: inline-flex;
      flex-flow: row wrap;
      justify-content: flex-start;
      width: 100%;
      height: 100%;
    }

    :host([orientation='vertical']) .positioning-region {
      flex-direction: column;
    }

    ::slotted(:not([slot])) {
      flex: 0 0 auto;
      margin: 0 var(--toolbar-item-gap);
    }

    :host([orientation='vertical']) ::slotted(:not([slot])) {
      margin: var(--toolbar-item-gap) 0;
    }

    .start,
    .end {
      display: flex;
      margin: auto;
      margin-inline: 0;
    }

    ::slotted(svg) {
      /* TODO: adaptive typography https://github.com/microsoft/fast/issues/2432 */
      width: 16px;
      height: 16px;
    }
  `.withBehaviors((0,q.forcedColorsStylesheetBehavior)(yr.css`
      :host(:${q.focusVisible}) {
        box-shadow: 0 0 0 calc(${Ce} * 1px)
          ${kr.Highlight};
        color: ${kr.ButtonText};
        forced-color-adjust: none;
      }
    `)),vl=Object.freeze({[Ba.uf.ArrowUp]:{[qi.i.vertical]:-1},[Ba.uf.ArrowDown]:{[qi.i.vertical]:1},[Ba.uf.ArrowLeft]:{[qi.i.horizontal]:{[W.N.ltr]:-1,[W.N.rtl]:1}},[Ba.uf.ArrowRight]:{[qi.i.horizontal]:{[W.N.ltr]:1,[W.N.rtl]:-1}}});class $l extends q.FoundationElement{constructor(){super(...arguments),this._activeIndex=0,this.direction=W.N.ltr,this.orientation=qi.i.horizontal}get activeIndex(){return yr.Observable.track(this,"activeIndex"),this._activeIndex}set activeIndex(e){this.$fastController.isConnected&&(this._activeIndex=(0,bl.b9)(0,this.focusableElements.length-1,e),yr.Observable.notify(this,"activeIndex"))}slottedItemsChanged(){this.$fastController.isConnected&&this.reduceFocusableElements()}mouseDownHandler(e){var t;const o=null===(t=this.focusableElements)||void 0===t?void 0:t.findIndex((t=>t.contains(e.target)));return o>-1&&this.activeIndex!==o&&this.setFocusedElement(o),!0}childItemsChanged(e,t){this.$fastController.isConnected&&this.reduceFocusableElements()}connectedCallback(){super.connectedCallback(),this.direction=(0,q.getDirection)(this)}focusinHandler(e){const t=e.relatedTarget;t&&!this.contains(t)&&this.setFocusedElement()}getDirectionalIncrementer(e){var t,o,r,a,i;return null!==(i=null!==(r=null===(o=null===(t=vl[e])||void 0===t?void 0:t[this.orientation])||void 0===o?void 0:o[this.direction])&&void 0!==r?r:null===(a=vl[e])||void 0===a?void 0:a[this.orientation])&&void 0!==i?i:0}keydownHandler(e){const t=e.key;if(!(t in Ba.uf)||e.defaultPrevented||e.shiftKey)return!0;const o=this.getDirectionalIncrementer(t);if(!o)return!e.target.closest("[role=radiogroup]");const r=this.activeIndex+o;return this.focusableElements[r]&&e.preventDefault(),this.setFocusedElement(r),!0}get allSlottedItems(){return[...this.start.assignedElements(),...this.slottedItems,...this.end.assignedElements()]}reduceFocusableElements(){var e;const t=null===(e=this.focusableElements)||void 0===e?void 0:e[this.activeIndex];this.focusableElements=this.allSlottedItems.reduce($l.reduceFocusableItems,[]);const o=this.focusableElements.indexOf(t);this.activeIndex=Math.max(0,o),this.setFocusableElements()}setFocusedElement(e=this.activeIndex){this.activeIndex=e,this.setFocusableElements(),this.focusableElements[this.activeIndex]&&this.contains(document.activeElement)&&this.focusableElements[this.activeIndex].focus()}static reduceFocusableItems(e,t){var o,r,a,i;const l="radio"===t.getAttribute("role"),n=null===(r=null===(o=t.$fastController)||void 0===o?void 0:o.definition.shadowOptions)||void 0===r?void 0:r.delegatesFocus,s=Array.from(null!==(i=null===(a=t.shadowRoot)||void 0===a?void 0:a.querySelectorAll("*"))&&void 0!==i?i:[]).some((e=>(0,fl.EB)(e)));return t.hasAttribute("disabled")||t.hasAttribute("hidden")||!((0,fl.EB)(t)||l||n||s)?t.childElementCount?e.concat(Array.from(t.children).reduce($l.reduceFocusableItems,[])):e:(e.push(t),e)}setFocusableElements(){this.$fastController.isConnected&&this.focusableElements.length>0&&this.focusableElements.forEach(((e,t)=>{e.tabIndex=this.activeIndex===t?0:-1}))}}zr([yr.observable],$l.prototype,"direction",void 0),zr([yr.attr],$l.prototype,"orientation",void 0),zr([yr.observable],$l.prototype,"slottedItems",void 0),zr([yr.observable],$l.prototype,"slottedLabel",void 0),zr([yr.observable],$l.prototype,"childItems",void 0);class xl{}zr([(0,yr.attr)({attribute:"aria-labelledby"})],xl.prototype,"ariaLabelledby",void 0),zr([(0,yr.attr)({attribute:"aria-label"})],xl.prototype,"ariaLabel",void 0),(0,q.applyMixins)(xl,q.ARIAGlobalStatesAndProperties),(0,q.applyMixins)($l,q.StartEnd,xl);class yl extends $l{connectedCallback(){super.connectedCallback();const e=(0,q.composedParent)(this);e&&Ot.setValueFor(this,(t=>Vo.getValueFor(t).evaluate(t,Ot.getValueFor(e))))}}const wl=yl.compose({baseName:"toolbar",baseClass:$l,template:q.toolbarTemplate,styles:ml,shadowOptions:{delegatesFocus:!0}}),kl=(e,t)=>{const o=e.tagFor(q.AnchoredRegion);return yr.css`
    :host {
      contain: size;
      overflow: visible;
      height: 0;
      width: 0;
    }

    .tooltip {
      box-sizing: border-box;
      border-radius: calc(${ve} * 1px);
      border: calc(${Fe} * 1px) solid ${To};
      box-shadow: 0 0 0 1px ${To} inset;
      background: ${lo};
      color: ${Ho};
      padding: 4px;
      height: fit-content;
      width: fit-content;
      font-family: ${ge};
      font-size: ${Ve};
      line-height: ${Se};
      white-space: nowrap;
      /* TODO: a mechanism to manage z-index across components
                    https://github.com/microsoft/fast/issues/3813 */
      z-index: 10000;
    }

    ${o} {
      display: flex;
      justify-content: center;
      align-items: center;
      overflow: visible;
      flex-direction: row;
    }

    ${o}.right,
    ${o}.left {
      flex-direction: column;
    }

    ${o}.top .tooltip {
      margin-bottom: 4px;
    }

    ${o}.bottom .tooltip {
      margin-top: 4px;
    }

    ${o}.left .tooltip {
      margin-right: 4px;
    }

    ${o}.right .tooltip {
      margin-left: 4px;
    }

    ${o}.top.left .tooltip,
            ${o}.top.right .tooltip {
      margin-bottom: 0px;
    }

    ${o}.bottom.left .tooltip,
            ${o}.bottom.right .tooltip {
      margin-top: 0px;
    }

    ${o}.top.left .tooltip,
            ${o}.bottom.left .tooltip {
      margin-right: 0px;
    }

    ${o}.top.right .tooltip,
            ${o}.bottom.right .tooltip {
      margin-left: 0px;
    }
  `.withBehaviors((0,q.forcedColorsStylesheetBehavior)(yr.css`
      :host([disabled]) {
        opacity: 1;
      }
    `))};class Fl extends q.Tooltip{}const Cl=Fl.compose({baseName:"tooltip",baseClass:q.Tooltip,template:q.tooltipTemplate,styles:kl}),Vl=yr.cssPartial`(((${be} + ${$e}) * 0.5 + 2) * ${xe})`,Sl=yr.css`
  .expand-collapse-glyph {
    transform: rotate(0deg);
  }
  :host(.nested) .expand-collapse-button {
    left: var(
      --expand-collapse-button-nested-width,
      calc(
        (
            ${Vl} +
              ((${be} + ${$e}) * 1.25)
          ) * -1px
      )
    );
  }
  :host([selected])::after {
    left: calc(${Ce} * 1px);
  }
  :host([expanded]) > .positioning-region .expand-collapse-glyph {
    transform: rotate(90deg);
  }
`,Dl=yr.css`
  .expand-collapse-glyph {
    transform: rotate(180deg);
  }
  :host(.nested) .expand-collapse-button {
    right: var(
      --expand-collapse-button-nested-width,
      calc(
        (
            ${Vl} +
              ((${be} + ${$e}) * 1.25)
          ) * -1px
      )
    );
  }
  :host([selected])::after {
    right: calc(${Ce} * 1px);
  }
  :host([expanded]) > .positioning-region .expand-collapse-glyph {
    transform: rotate(90deg);
  }
`,Tl=q.DesignToken.create("tree-item-expand-collapse-hover").withDefault((e=>{const t=fo.getValueFor(e);return t.evaluate(e,t.evaluate(e).hover).hover})),zl=q.DesignToken.create("tree-item-expand-collapse-selected-hover").withDefault((e=>{const t=io.getValueFor(e);return fo.getValueFor(e).evaluate(e,t.evaluate(e).rest).hover})),Bl=(e,t)=>yr.css`
    /**
     * This animation exists because when tree item children are conditionally loaded
     * there is a visual bug where the DOM exists but styles have not yet been applied (essentially FOUC).
     * This subtle animation provides a ever so slight timing adjustment for loading that solves the issue.
     */
    @keyframes treeItemLoading {
      0% {
        opacity: 0;
      }
      100% {
        opacity: 1;
      }
    }

    ${(0,q.display)("block")} :host {
      contain: content;
      position: relative;
      outline: none;
      color: ${Ho};
      background: ${mo};
      cursor: pointer;
      font-family: ${ge};
      --tree-item-nested-width: 0;
    }

    :host(:focus) > .positioning-region {
      outline: none;
    }

    :host(:focus) .content-region {
      outline: none;
    }

    :host(:${q.focusVisible}) .positioning-region {
      border-color: ${Gt};
      box-shadow: 0 0 0 calc((${Ce} - ${Fe}) * 1px)
        ${Gt} inset;
      color: ${Ho};
    }

    .positioning-region {
      display: flex;
      position: relative;
      box-sizing: border-box;
      background: ${mo};
      border: transparent calc(${Fe} * 1px) solid;
      border-radius: calc(${ve} * 1px);
      height: calc((${Fr} + 1) * 1px);
    }

    .positioning-region::before {
      content: '';
      display: block;
      width: var(--tree-item-nested-width);
      flex-shrink: 0;
    }

    :host(:not([disabled])) .positioning-region:hover {
      background: ${vo};
    }

    :host(:not([disabled])) .positioning-region:active {
      background: ${$o};
    }

    .content-region {
      display: inline-flex;
      align-items: center;
      white-space: nowrap;
      width: 100%;
      min-width: 0;
      height: calc(${Fr} * 1px);
      margin-inline-start: calc(${xe} * 2px + 8px);
      font-size: ${Ve};
      line-height: ${Se};
      font-weight: 400;
    }

    .items {
      /* TODO: adaptive typography https://github.com/microsoft/fast/issues/2432 */
      font-size: calc(1em + (${xe} + 16) * 1px);
    }

    .expand-collapse-button {
      background: none;
      border: none;
      outline: none;
      /* TODO: adaptive typography https://github.com/microsoft/fast/issues/2432 */
      width: calc(${Vl} * 1px);
      height: calc(${Vl} * 1px);
      padding: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      margin-left: 6px;
      margin-right: 6px;
    }

    .expand-collapse-glyph {
      /* TODO: adaptive typography https://github.com/microsoft/fast/issues/2432 */
      width: calc((16 + ${$e}) * 1px);
      height: calc((16 + ${$e}) * 1px);
      transition: transform 0.1s linear;

      pointer-events: none;
      fill: currentcolor;
    }

    .start,
    .end {
      display: flex;
      fill: currentcolor;
    }

    ::slotted(svg) {
      /* TODO: adaptive typography https://github.com/microsoft/fast/issues/2432 */
      width: 16px;
      height: 16px;

      /* Something like that would do if the typography is adaptive
      font-size: inherit;
      width: ${je};
      height: ${je};
      */
    }

    .start {
      /* TODO: horizontalSpacing https://github.com/microsoft/fast/issues/2766 */
      margin-inline-end: calc(${xe} * 2px + 2px);
    }

    .end {
      /* TODO: horizontalSpacing https://github.com/microsoft/fast/issues/2766 */
      margin-inline-start: calc(${xe} * 2px + 2px);
    }

    :host([expanded]) > .items {
      animation: treeItemLoading ease-in 10ms;
      animation-iteration-count: 1;
      animation-fill-mode: forwards;
    }

    :host([disabled]) .content-region {
      opacity: ${ke};
      cursor: ${q.disabledCursor};
    }

    :host(.nested) .content-region {
      position: relative;
      /* Add left margin to collapse button size */
      margin-inline-start: calc(
        (
            ${Vl} +
              ((${be} + ${$e}) * 1.25)
          ) * 1px
      );
    }

    :host(.nested) .expand-collapse-button {
      position: absolute;
    }

    :host(.nested:not([disabled])) .expand-collapse-button:hover {
      background: ${Tl};
    }

    :host([selected]) .positioning-region {
      background: ${lo};
    }

    :host([selected]:not([disabled])) .positioning-region:hover {
      background: ${no};
    }

    :host([selected]:not([disabled])) .positioning-region:active {
      background: ${so};
    }

    :host([selected]:not([disabled])) .expand-collapse-button:hover {
      background: ${zl};
    }

    :host([selected])::after {
      /* The background needs to be calculated based on the selected background state
         for this control. We currently have no way of changing that, so setting to
         accent-foreground-rest for the time being */
      background: ${to};
      border-radius: calc(${ve} * 1px);
      content: '';
      display: block;
      position: absolute;
      top: calc((${Fr} / 4) * 1px);
      width: 3px;
      height: calc((${Fr} / 2) * 1px);
    }

    ::slotted(${e.tagFor(q.TreeItem)}) {
      --tree-item-nested-width: 1em;
      --expand-collapse-button-nested-width: calc(
        (
            ${Vl} +
              ((${be} + ${$e}) * 1.25)
          ) * -1px
      );
    }
  `.withBehaviors(new qr(Sl,Dl),(0,q.forcedColorsStylesheetBehavior)(yr.css`
      :host {
        forced-color-adjust: none;
        border-color: transparent;
        background: ${kr.Field};
        color: ${kr.FieldText};
      }
      :host .content-region .expand-collapse-glyph {
        fill: ${kr.FieldText};
      }
      :host .positioning-region:hover,
      :host([selected]) .positioning-region {
        background: ${kr.Highlight};
      }
      :host .positioning-region:hover .content-region,
      :host([selected]) .positioning-region .content-region {
        color: ${kr.HighlightText};
      }
      :host .positioning-region:hover .content-region .expand-collapse-glyph,
      :host .positioning-region:hover .content-region .start,
      :host .positioning-region:hover .content-region .end,
      :host([selected]) .content-region .expand-collapse-glyph,
      :host([selected]) .content-region .start,
      :host([selected]) .content-region .end {
        fill: ${kr.HighlightText};
      }
      :host([selected])::after {
        background: ${kr.Field};
      }
      :host(:${q.focusVisible}) .positioning-region {
        border-color: ${kr.FieldText};
        box-shadow: 0 0 0 2px inset ${kr.Field};
        color: ${kr.FieldText};
      }
      :host([disabled]) .content-region,
      :host([disabled]) .positioning-region:hover .content-region {
        opacity: 1;
        color: ${kr.GrayText};
      }
      :host([disabled]) .content-region .expand-collapse-glyph,
      :host([disabled]) .content-region .start,
      :host([disabled]) .content-region .end,
      :host([disabled])
        .positioning-region:hover
        .content-region
        .expand-collapse-glyph,
      :host([disabled]) .positioning-region:hover .content-region .start,
      :host([disabled]) .positioning-region:hover .content-region .end {
        fill: ${kr.GrayText};
      }
      :host([disabled]) .positioning-region:hover {
        background: ${kr.Field};
      }
      .expand-collapse-glyph,
      .start,
      .end {
        fill: ${kr.FieldText};
      }
      :host(.nested) .expand-collapse-button:hover {
        background: ${kr.Field};
      }
      :host(.nested) .expand-collapse-button:hover .expand-collapse-glyph {
        fill: ${kr.FieldText};
      }
    `));class jl extends q.TreeItem{}const Ll=jl.compose({baseName:"tree-item",baseClass:q.TreeItem,template:q.treeItemTemplate,styles:Bl,expandCollapseGlyph:'\n        <svg\n            viewBox="0 0 16 16"\n            xmlns="http://www.w3.org/2000/svg"\n            class="expand-collapse-glyph"\n        >\n            <path\n                d="M5.00001 12.3263C5.00124 12.5147 5.05566 12.699 5.15699 12.8578C5.25831 13.0167 5.40243 13.1437 5.57273 13.2242C5.74304 13.3047 5.9326 13.3354 6.11959 13.3128C6.30659 13.2902 6.4834 13.2152 6.62967 13.0965L10.8988 8.83532C11.0739 8.69473 11.2153 8.51658 11.3124 8.31402C11.4096 8.11146 11.46 7.88966 11.46 7.66499C11.46 7.44033 11.4096 7.21853 11.3124 7.01597C11.2153 6.81341 11.0739 6.63526 10.8988 6.49467L6.62967 2.22347C6.48274 2.10422 6.30501 2.02912 6.11712 2.00691C5.92923 1.9847 5.73889 2.01628 5.56823 2.09799C5.39757 2.17969 5.25358 2.30817 5.153 2.46849C5.05241 2.62882 4.99936 2.8144 5.00001 3.00369V12.3263Z"\n            />\n        </svg>\n    '}),Nl=(e,t)=>yr.css`
  ${(0,q.display)("flex")} :host {
    flex-direction: column;
    align-items: stretch;
    min-width: fit-content;
    font-size: 0;
  }

  :host:focus-visible {
    outline: none;
  }
`;class Hl extends q.TreeView{handleClick(e){if(e.defaultPrevented)return;if(!(e.target instanceof Element))return!0;let t=e.target;for(;t&&!(0,q.isTreeItemElement)(t);)t=t.parentElement,t===this&&(t=null);t&&!t.disabled&&(t.selected=!0)}}const Ol=Hl.compose({baseName:"tree-view",baseClass:q.TreeView,template:q.treeViewTemplate,styles:Nl}),Rl=(e,t)=>yr.css`
  .region {
    z-index: 1000;
    overflow: hidden;
    display: flex;
    font-family: ${ge};
    font-size: ${Ve};
  }

  .loaded {
    opacity: 1;
    pointer-events: none;
  }

  .loading-display,
  .no-options-display {
    background: ${Ot};
    width: 100%;
    min-height: calc(${Fr} * 1px);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-items: center;
    padding: calc(${xe} * 1px);
  }

  .loading-progress {
    width: 42px;
    height: 42px;
  }

  .bottom {
    flex-direction: column;
  }

  .top {
    flex-direction: column-reverse;
  }
`,Pl=(e,t)=>yr.css`
    :host {
      background: ${Ot};
      --elevation: 11;
      /* TODO: a mechanism to manage z-index across components
            https://github.com/microsoft/fast/issues/3813 */
      z-index: 1000;
      display: flex;
      width: 100%;
      max-height: 100%;
      min-height: 58px;
      box-sizing: border-box;
      flex-direction: column;
      overflow-y: auto;
      overflow-x: hidden;
      pointer-events: auto;
      border-radius: calc(${ve} * 1px);
      padding: calc(${xe} * 1px) 0;
      border: calc(${Fe} * 1px) solid transparent;
      ${ca}
    }

    .suggestions-available-alert {
      height: 0;
      opacity: 0;
      overflow: hidden;
    }
  `.withBehaviors((0,q.forcedColorsStylesheetBehavior)(yr.css`
      :host {
        background: ${kr.Canvas};
        border-color: ${kr.CanvasText};
      }
    `)),Il=(e,t)=>yr.css`
    :host {
      display: flex;
      align-items: center;
      justify-items: center;
      font-family: ${ge};
      border-radius: calc(${ve} * 1px);
      border: calc(${Ce} * 1px) solid transparent;
      box-sizing: border-box;
      background: ${mo};
      color: ${Ho};
      cursor: pointer;
      fill: currentcolor;
      font-size: ${Ve};
      min-height: calc(${Fr} * 1px);
      line-height: ${Se};
      margin: 0 calc(${xe} * 1px);
      outline: none;
      overflow: hidden;
      padding: 0 calc(${xe} * 2.25px);
      user-select: none;
      white-space: nowrap;
    }

    :host(:${q.focusVisible}[role="listitem"]) {
      border-color: ${To};
      background: ${xo};
    }

    :host(:hover) {
      background: ${vo};
    }

    :host(:active) {
      background: ${$o};
    }

    :host([aria-selected='true']) {
      background: ${It};
      color: ${qt};
    }

    :host([aria-selected='true']:hover) {
      background: ${At};
      color: ${Wt};
    }

    :host([aria-selected='true']:active) {
      background: ${Mt};
      color: ${Ut};
    }
  `.withBehaviors((0,q.forcedColorsStylesheetBehavior)(yr.css`
      :host {
        border-color: transparent;
        forced-color-adjust: none;
        color: ${kr.ButtonText};
        fill: currentcolor;
      }

      :host(:not([aria-selected='true']):hover),
      :host([aria-selected='true']) {
        background: ${kr.Highlight};
        color: ${kr.HighlightText};
      }

      :host([disabled]),
      :host([disabled]:not([aria-selected='true']):hover) {
        background: ${kr.Canvas};
        color: ${kr.GrayText};
        fill: currentcolor;
        opacity: 1;
      }
    `)),Al=(e,t)=>yr.css`
    :host {
      display: flex;
      align-items: center;
      justify-items: center;
      font-family: ${ge};
      border-radius: calc(${ve} * 1px);
      border: calc(${Ce} * 1px) solid transparent;
      box-sizing: border-box;
      background: ${mo};
      color: ${Ho};
      cursor: pointer;
      fill: currentcolor;
      font-size: ${Ve};
      height: calc(${Fr} * 1px);
      line-height: ${Se};
      outline: none;
      overflow: hidden;
      padding: 0 calc(${xe} * 2.25px);
      user-select: none;
      white-space: nowrap;
    }

    :host(:hover) {
      background: ${vo};
    }

    :host(:active) {
      background: ${$o};
    }

    :host(:${q.focusVisible}) {
      background: ${xo};
      border-color: ${To};
    }

    :host([aria-selected='true']) {
      background: ${It};
      color: ${Ut};
    }
  `.withBehaviors((0,q.forcedColorsStylesheetBehavior)(yr.css`
      :host {
        border-color: transparent;
        forced-color-adjust: none;
        color: ${kr.ButtonText};
        fill: currentcolor;
      }

      :host(:not([aria-selected='true']):hover),
      :host([aria-selected='true']) {
        background: ${kr.Highlight};
        color: ${kr.HighlightText};
      }

      :host([disabled]),
      :host([disabled]:not([aria-selected='true']):hover) {
        background: ${kr.Canvas};
        color: ${kr.GrayText};
        fill: currentcolor;
        opacity: 1;
      }
    `));class Ml extends q.Picker{}const Gl=Ml.compose({baseName:"draft-picker",baseClass:q.Picker,template:q.pickerTemplate,styles:Rl,shadowOptions:{}});class El extends q.PickerMenu{connectedCallback(){Ot.setValueFor(this,St),super.connectedCallback()}}const _l=El.compose({baseName:"draft-picker-menu",baseClass:q.PickerMenu,template:q.pickerMenuTemplate,styles:Pl});class ql extends q.PickerMenuOption{}const Wl=ql.compose({baseName:"draft-picker-menu-option",baseClass:q.PickerMenuOption,template:q.pickerMenuOptionTemplate,styles:Il});class Ul extends q.PickerList{}const Xl=Ul.compose({baseName:"draft-picker-list",baseClass:q.PickerList,template:q.pickerListTemplate,styles:(e,t)=>yr.css`
        :host {
            display: flex;
            flex-direction: row;
            column-gap: calc(${xe} * 1px);
            row-gap: calc(${xe} * 1px);
            flex-wrap: wrap;
        }

        ::slotted([role="combobox"]) {
            min-width: 260px;
            width: auto;
            box-sizing: border-box;
            color: ${Ho};
            background: ${uo};
            border-radius: calc(${ve} * 1px);
            border: calc(${Fe} * 1px) solid ${It};
            height: calc(${Fr} * 1px);
            font-family: ${ge};
            outline: none;
            user-select: none;
            font-size: ${Ve};
            line-height: ${Se};
            padding: 0 calc(${xe} * 2px + 1px);
        }

        ::slotted([role="combobox"]:active) { {
            background: ${po};
            border-color: ${Mt};
        }

        ::slotted([role="combobox"]:focus-within) {
            border-color: ${To};
            box-shadow: 0 0 0 1px ${To} inset;
        }
    `.withBehaviors((0,q.forcedColorsStylesheetBehavior)(yr.css`
      ::slotted([role='combobox']:active) {
        background: ${kr.Field};
        border-color: ${kr.Highlight};
      }
      ::slotted([role='combobox']:focus-within) {
        border-color: ${kr.Highlight};
        box-shadow: 0 0 0 1px ${kr.Highlight} inset;
      }
      ::slotted(input:placeholder) {
        color: ${kr.GrayText};
      }
    `))});class Yl extends q.PickerListItem{}const Zl=Yl.compose({baseName:"draft-picker-list-item",baseClass:q.PickerListItem,template:q.pickerListItemTemplate,styles:Al}),Jl={jpAccordion:Tr,jpAccordionItem:Sr,jpAnchor:Mr,jpAnchoredRegion:_r,jpAvatar:Zr,jpBadge:Qr,jpBreadcrumb:oa,jpBreadcrumbItem:ia,jpButton:sa,jpCard:ua,jpCheckbox:fa,jpCombobox:ya,jpDataGrid:za,jpDataGridCell:Va,jpDataGridRow:Da,jpDateField:Aa,jpDesignSystemProvider:Ua,jpDialog:Za,jpDisclosure:Qa,jpDivider:oi,jpListbox:ai,jpMenu:ni,jpMenuItem:di,jpNumberField:pi,jpOption:fi,jpPicker:Gl,jpPickerList:Xl,jpPickerListItem:Zl,jpPickerMenu:_l,jpPickerMenuOption:Wl,jpProgress:$i,jpProgressRing:wi,jpRadio:Vi,jpRadioGroup:Ti,jpSearch:Ni,jpSelect:Oi,jpSkeleton:Ii,jpSlider:_i,jpSliderLabel:Zi,jpSwitch:Qi,jpTab:il,jpTabPanel:ol,jpTabs:sl,jpTextArea:hl,jpTextField:gl,jpToolbar:wl,jpTooltip:Cl,jpTreeItem:Ll,jpTreeView:Ol,register(e,...t){if(e)for(const o in this)"register"!==o&&this[o]().register(e,...t)}};function Kl(e){return q.DesignSystem.getOrCreate(e).withPrefix("jp")}}}]);
//# sourceMappingURL=4333.86857e4.js.map