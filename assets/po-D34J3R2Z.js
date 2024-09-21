const e="Gettext PO",n=["po","pot","potx"],t="po",o=[{begin:'^(?=(msgid(_plural)?|msgctxt)\\s*"[^"])|^\\s*$',comment:"Start of body of document, after header",end:"\\z",patterns:[{include:"#body"}]},{include:"#comments"},{match:'^msg(id|str)\\s+""\\s*$\\n?',name:"comment.line.number-sign.po"},{captures:{1:{name:"constant.language.po"},2:{name:"punctuation.separator.key-value.po"},3:{name:"string.other.po"}},match:'^"(?:([^\\s:]+)(:)\\s+)?([^"]*)"\\s*$\\n?',name:"meta.header.po"}],a={body:{patterns:[{begin:"^(msgid(_plural)?)\\s+",beginCaptures:{1:{name:"keyword.control.msgid.po"}},end:'^(?!")',name:"meta.scope.msgid.po",patterns:[{begin:'(\\G|^)"',end:'"',name:"string.quoted.double.po",patterns:[{match:'\\\\[\\\\"]',name:"constant.character.escape.po"}]}]},{begin:"^(msgstr)(?:(\\[)(\\d+)(\\]))?\\s+",beginCaptures:{1:{name:"keyword.control.msgstr.po"},2:{name:"keyword.control.msgstr.po"},3:{name:"constant.numeric.po"},4:{name:"keyword.control.msgstr.po"}},end:'^(?!")',name:"meta.scope.msgstr.po",patterns:[{begin:'(\\G|^)"',end:'"',name:"string.quoted.double.po",patterns:[{match:'\\\\[\\\\"]',name:"constant.character.escape.po"}]}]},{begin:"^(msgctxt)(?:(\\[)(\\d+)(\\]))?\\s+",beginCaptures:{1:{name:"keyword.control.msgctxt.po"},2:{name:"keyword.control.msgctxt.po"},3:{name:"constant.numeric.po"},4:{name:"keyword.control.msgctxt.po"}},end:'^(?!")',name:"meta.scope.msgctxt.po",patterns:[{begin:'(\\G|^)"',end:'"',name:"string.quoted.double.po",patterns:[{match:'\\\\[\\\\"]',name:"constant.character.escape.po"}]}]},{captures:{1:{name:"punctuation.definition.comment.po"}},match:"^(#~).*$\\n?",name:"comment.line.number-sign.obsolete.po"},{include:"#comments"},{comment:'a line that does not begin with # or ". Could improve this regexp',match:'^(?!\\s*$)[^#"].*$\\n?',name:"invalid.illegal.po"}]},comments:{patterns:[{begin:"^(?=#)",end:"(?!\\G)",patterns:[{begin:"(#,)\\s+",beginCaptures:{1:{name:"punctuation.definition.comment.po"}},end:"\\n",name:"comment.line.number-sign.flag.po",patterns:[{captures:{1:{name:"entity.name.type.flag.po"}},match:"(?:\\G|,\\s*)((?:fuzzy)|(?:no-)?(?:c|objc|sh|lisp|elisp|librep|scheme|smalltalk|java|csharp|awk|object-pascal|ycp|tcl|perl|perl-brace|php|gcc-internal|qt|boost)-format)"}]},{begin:"#\\.",beginCaptures:{0:{name:"punctuation.definition.comment.po"}},end:"\\n",name:"comment.line.number-sign.extracted.po"},{begin:"(#:)[ \\t]*",beginCaptures:{1:{name:"punctuation.definition.comment.po"}},end:"\\n",name:"comment.line.number-sign.reference.po",patterns:[{match:"(\\S+:)([\\d;]*)",name:"storage.type.class.po"}]},{begin:"#\\|",beginCaptures:{0:{name:"punctuation.definition.comment.po"}},end:"\\n",name:"comment.line.number-sign.previous.po"},{begin:"#",beginCaptures:{0:{name:"punctuation.definition.comment.po"}},end:"\\n",name:"comment.line.number-sign.po"}]}]}},m="source.po",s={displayName:e,fileTypes:n,name:t,patterns:o,repository:a,scopeName:m};export{s as default,e as displayName,n as fileTypes,t as name,o as patterns,a as repository,m as scopeName};
