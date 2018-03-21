# [bass](https://jeffbobbo.github.io/bass/)
An armour set searcher for Monster Hunter Freedom Unite.

Very much still a work in progress, and probably has bugs (not to mention poor HTML/CSS/design). Issues and bugs can be reported in [issues](https://github.com/JeffBobbo/bass/issues).

Things to note:
* Torso Inc doesn't apply to jewels on the chest piece
* To reduce the search space, armour considered to not attribute enough to the wanted skills are cut out, this could mean that you end up with missing sets from your search, or different results from Athena's A.S.S (or another search tool).

## Using locally
Data is retrieved via `XMLHttpRequest`s, some (most? Chrome at least) browsers block `XMLHttpRequest`s over the `file://` protocol. Your browser might have an option to allow it, or otherwise can be solved by using a webserver locally.

## Acknowledgements
* [sj1k](https://github.com/Sjc1000) for reference and guidence.
* Plesioth (of ##monsterhunter on FreeNode) for guidence.
