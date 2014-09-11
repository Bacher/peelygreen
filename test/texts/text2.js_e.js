var a = {
    lol: function originalName() {console.log(new Date().toTimeString().split(' ')[0], '=== PG:Call lol (originalName)', arguments);
        var href = document.location.href;
    }
};

a.lol();
