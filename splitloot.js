var memberList = $('#member-list');
var memberTemplate = memberList.children().first();

var meanType = $('#meantype');
var splitTotal = $('#split-total');
var splitRepair = $('#split-repair');
var splitPercent = $('#split-percent');
var splitRecap = $('#split-recap');

$(document).ready(function () {
    setPercentInputConstraint();

    memberTemplate.hide();

    $('input').change(calculateSplit);
    $('select').change(calculateSplit);

    var defaultMemberCount = 3;
    for (var i = 0; i < defaultMemberCount; ++i)
        addMember();

});

function setPercentInputConstraint() {
    $('input.percent').change(function () {
        var element = $(this);
        var value = element.val();
        if (value < 0)
            element.val(0);
        if (value > 100)
            element.val(100);
    });
}

function evaluateExpression(element) {
    var expression = $(element).val();
    var value = math.eval(expression);
    $(element).val(value);
}

function setSplitter(element) {
    var splitterClass = 'text-primary';
    $('.person-icon').removeClass(splitterClass);
    $('.member-is-splitter').val(null);

    $(element).addClass(splitterClass);
    $(element).siblings('.member-is-splitter').val("true");
    calculateSplit();
}

function addMember() {
    var member = memberTemplate.clone(true);
    memberList.append(member);
    member.show();
    calculateSplit();
}

function removeMember(element) {
    $(element).closest('tr').remove();
    calculateSplit();
}

function calculateSplit() {
    var members = memberList.children()
        .map(function () {
            var name = $(this).find('.member-name');
            var cont = $(this).find('.member-contribution');
            var isSplitter = $(this).find('.member-is-splitter');
            return { name: name.val(), contribution: (+cont.val() / 100), isSplitter: !!isSplitter.val() }
        })
        .filter(function () { return !!this.name; })
        .toArray();
    var total = math.eval(splitTotal.val());
    var repair = math.eval(splitRepair.val());
    var percent = +splitPercent.val() / 100;
    var totalNet = (total - repair) * (1 - percent);
    var splitterQuota = (total - repair) * percent;

    var steps = members
        .map(m => m.contribution)
        .filter((contribution, index, contributions) => contributions.indexOf(contribution) === index)
        .sort();
    var stepCounts = steps
        .map(c => members.filter(m => m.contribution >= c).length);
    var stepQuotas = steps
        .map((s,i,a) => ((s - (a[i-1]||0))/stepCounts[i]))
        .map((sum => value => sum += value)(0));
    var totalContribution = members.reduce(function (totalContribution, member) { return totalContribution + member.contribution; }, 0);

    var members = members.map(function (member) {
        return {
            name: member.name,
            quota: meanType.val() === "mean"
                ? (totalNet * (member.contribution / totalContribution) + (member.isSplitter ? splitterQuota : 0))
                : (totalNet * stepQuotas[steps.indexOf(member.contribution)] + (member.isSplitter ? splitterQuota : 0)),
            isSplitter: member.isSplitter,
        };
    });

    var recap = {
        total,
        repair,
        totalNet,
        members,
        splitterPercent: percent,
        splitterQuota,
    };
    displayRecap(recap);
}

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "&thinsp;");
}

function displayRecap(recap) {
    splitRecap.empty();
    splitRecap.append(`<span><strong>Total: </strong>${numberWithCommas(~~recap.total)}</span><br/>`)
    splitRecap.append(`<span><strong>Repair: </strong>${numberWithCommas(~~recap.repair)}</span><br/>`)
    splitRecap.append(`<span><strong>Total (net): </strong>${numberWithCommas(~~recap.totalNet)}</span><br/>`)
    splitRecap.append(`<span><strong>Splitter fee: </strong>${numberWithCommas(~~recap.splitterQuota)} (${recap.splitterPercent * 100}%)</span><br/>`)
    splitRecap.append('<hr>');
    recap.members.forEach(function (member) {
        splitRecap.append(`<span><strong>${member.name}</strong> ${numberWithCommas(~~member.quota)}${member.isSplitter ? ' <strong>(splitter)</strong>' : ''}</span><br/>`)
    });
    // splitRecap.append('<pre>'+JSON.stringify(recap, null, 4)+'</pre>');
}