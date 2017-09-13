Promise.all(['../units.json', 'guild-toons.json'].map(u => fetch(u).then(r => r.json()))).then(data => {
    var [units, guild] = data;
    var byId = {};
    Object.values(units).forEach(unit => byId[unit.unitId.split(':')[0]] = unit);

    var mkslug = str => str.replace(/[^a-z0-9\-]/gi, '_');

    var battle = platoons => {
        $('#filedrag').hide();
        $('#loaded').show();

        var def = () => {return { 'need': 0, 'have': 0};};

        // Check platoon requirements per phase to identify stress points
        var perPhase = [1,2,3,4,5,6].map(phase => {
            var sectors = platoons.filter(p => p.name.startsWith("phase0" + phase));
            var sector = {};
            sectors.forEach(s => s.platoons.forEach(p => p.squads.forEach(s => s.members.forEach(m => {
                var name = byId[m].name;
                if (sector[name] === undefined) { sector[name] = def(); }
                sector[name].need++;
            }))));
            Object.entries(guild).forEach(entry => {
                if (entry[0] in sector) {
                    sector[entry[0]].have = entry[1].filter(n => n > phase).length;
                }
            });
            return sector;
        });

        var platoon = pid => {
            var pnum = +pid.replace(/phase0(\d).*/, '$1');
            var p = platoons.filter(p => p.name === pid + "_recon01")[0].platoons;
            var toonips = {};
            p.sort((a, b) => a.name.localeCompare(b.name));
            p.forEach(q => {
                q.squads.sort((a, b) => a.name.localeCompare(b.name));
                var html = q.squads.map(squad => {
                    return '<div class="squad">'
                         + squad.members.map(m => {
                                var name = byId[m].name;
                                var slug = mkslug(name);
                                if (toonips[slug] === undefined) { toonips[slug] = def(); }
                                toonips[slug].need++;
                                return '<div class="toon-' + slug + '">' + name + '</div>';
                           }).join('')
                         + '</div>';
                }).join('');
                $('#' + q.name).html(html);
            });
            Object.entries(guild).forEach(entry => {
                if (mkslug(entry[0]) in toonips) {
                    toonips[mkslug(entry[0])].have = entry[1].filter(n => n > pnum).length;
                }
            });
            Object.entries(toonips).forEach(entry => {
                if (entry[1].have === 0) {
                    $('.toon-' + mkslug(entry[0])).addClass('fatal');
                } else if (entry[1].need > entry[1].have) {
                    $('.toon-' + mkslug(entry[0])).addClass('toofew');
                } else if (entry[1].need + 3 > entry[1].have) {
                    $('.toon-' + mkslug(entry[0])).addClass('close');
                }
            });

            $(".warnings").empty();
            var fatal = [],
                toofew = [],
                close = [];
            Object.entries(perPhase[pnum - 1]).forEach(entry => {
                if (entry[1].have === 0) {
                    fatal.push('<div class="fatal">' + entry[0] + ' is required ' + entry[1].need + ' times, but the guild has none</div>');
                } else if (entry[1].need > entry[1].have) {
                    toofew.push('<div class="toofew">' + entry[0] + ' is required ' + entry[1].need + ' times, but the guild only has ' + entry[1].have + '</div>');
                } else if (entry[1].need + 3 > entry[1].have) {
                    close.push('<div class="close">' + entry[0] + ' is required ' + entry[1].need + ' times, and the guild only has ' + entry[1].have + '</div>');
                }
            });

            if (fatal.length === 0 && toofew.length === 0 && close.length === 0) {
                $(".warnings").append('<h2>All platoons are fillable</h2>');
            } else {
                if ((fatal.length === 0) && (toofew.length === 0)) {
                    $(".warnings").append('<h2 class="close">All platoons are fillable with caution</h2>');
                } else {
                    $(".warnings").append('<h2 class="toofew">Some platoons are not fillable</h2>');
                }
                fatal.forEach(f => $(".warnings").append(f));
                toofew.forEach(f => $(".warnings").append(f));
                close.forEach(f => $(".warnings").append(f));
            }
        };

        platoon('phase01_conflict01');

        $('svg path').on('click', e => {
            $('svg path').removeClass('active');
            $(e.target).addClass('active');
            platoon($(e.target).attr('id'));
        });
    };

    fetch('platoons.json').then(r => r.json()).then(battle);
});
