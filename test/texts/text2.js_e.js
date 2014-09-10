var a = {
    lol: function originalName() {console.log('=== PG:Call lol (originalName)', arguments);
        var href = document.location.href;
    }
};

a.lol();
