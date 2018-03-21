# [bass](https://jeffbobbo.github.io/bass/)
An armour set searcher for Monster Hunter Freedom Unite.

Very much still a work in progress, and probably has bugs (not to mention poor HTML/CSS/design). Issues and bugs can be reported in [issues](https://github.com/JeffBobbo/bass/issues).

### Known issues with set searching
* Torso Inc doesn't apply to jewels on the chest piece
* To reduce the search space, armour considered to not attribute enough to the wanted skills are cut out, this could mean that you end up with missing sets from your search, or different results from other search tools.
* Jeweling is not fully solved, and only one attempt for jeweling is made for each set, potentially resulting in poorly jewelled or missing sets.

It is recommended that any results obtained from this tool are double checked by hand or with another before committing to it.

## Using locally
Data is retrieved via `XMLHttpRequest`s, some (most? Chrome at least) browsers block `XMLHttpRequest`s over the `file://` protocol. Your browser might have an option to allow it, or otherwise can be solved by using a webserver locally.

## Acknowledgements
* [sj1k](https://github.com/Sjc1000) for reference and guidence.
* Plesioth (of ##monsterhunter on FreeNode) for guidence.
