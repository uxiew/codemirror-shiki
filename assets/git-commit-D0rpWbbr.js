const e="Git Commit Message",t="git-commit",m=[{begin:"(?=^diff --git)",comment:"diff presented at the end of the commit message when using commit -v.",contentName:"source.diff",end:"\\z",name:"meta.embedded.diff.git-commit",patterns:[{include:"source.diff"}]},{begin:"^(?!#)",comment:"User supplied message",end:"^(?=#)",name:"meta.scope.message.git-commit",patterns:[{captures:{1:{name:"invalid.deprecated.line-too-long.git-commit"},2:{name:"invalid.illegal.line-too-long.git-commit"}},comment:"Mark > 50 lines as deprecated, > 72 as illegal",match:"\\G.{0,50}(.{0,22}(.*))$",name:"meta.scope.subject.git-commit"}]},{begin:"^(?=#)",comment:"Git supplied metadata in a number of lines starting with #",contentName:"comment.line.number-sign.git-commit",end:"^(?!#)",name:"meta.scope.metadata.git-commit",patterns:[{captures:{1:{name:"markup.changed.git-commit"}},match:"^#\\t((modified|renamed):.*)$"},{captures:{1:{name:"markup.inserted.git-commit"}},match:"^#\\t(new file:.*)$"},{captures:{1:{name:"markup.deleted.git-commit"}},match:"^#\\t(deleted.*)$"},{captures:{1:{name:"keyword.other.file-type.git-commit"},2:{name:"string.unquoted.filename.git-commit"}},comment:"Fallback for non-English git commit template",match:"^#\\t([^:]+): *(.*)$"}]}],i="text.git-commit",a={displayName:e,name:t,patterns:m,scopeName:i};export{a as default,e as displayName,t as name,m as patterns,i as scopeName};
