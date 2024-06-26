App = {
    web3Provider: null,
    contracts: {},
    account: '0x0',
    hasVoted: false,
    votedForID: 0,
    finishElection: 0,
    mins: 0,

    init: function () {
        return App.initWeb3();
    },

    initWeb3: async function () {
        if (window.ethereum) {
            App.web3Provider = window.ethereum;
            try {
                await window.ethereum.enable();
            } catch (error) {
                console.error("User denied account access");
            }
        } else if (window.web3) {
            App.web3Provider = window.web3.currentProvider;
        } else {
            App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
        }
        web3 = new Web3(App.web3Provider);
        web3.eth.defaultAccount = web3.eth.accounts[0];
        return App.initContract();
    },

    initContract: function () {
        $.getJSON("Election.json", function (election) {
            App.contracts.Election = TruffleContract(election);
            App.contracts.Election.setProvider(App.web3Provider);

            App.listenForEvents();

            return App.render();
        });
    },

    listenForEvents: function () {
        App.contracts.Election.deployed().then(function (instance) {
            instance.votedEvent({}, {
                fromBlock: 0,
                toBlock: 'latest'
            }).watch(function (error, event) {
                console.log("event triggered", event);
            });
        });
    },

    render: function () {
        var electionInstance;
        var loader = $("#loader");
        var content = $("#content");

        loader.show();
        content.hide();

        web3.eth.getCoinbase(function (err, account) {
            if (err === null) {
                App.account = account;
                $("#accountAddress").html("Your Account: " + account.substring(0, 8));
            }
        });

        App.contracts.Election.deployed().then(function (instance) {
            electionInstance = instance;
            return electionInstance.manager();
        }).then(function (manager) {
            if (manager !== App.account) {
                $('#admine').hide();
            }
            return electionInstance.candidatesCount();
        }).then(function (candidatesCount) {
            var candidatesResults = $("#candidatesResults");
            candidatesResults.empty();

            var candidatesSelect = $('#candidatesSelect');
            candidatesSelect.empty();

            var candidatesResultsContainer = $('#candidatesResultsContainer');
            candidatesResultsContainer.empty();

            for (var i = 1; i <= candidatesCount; i++) {
                electionInstance.candidates(i).then(function (candidate) {
                    var id = candidate[0];
                    var fname = candidate[1];
                    var lname = candidate[2];
                    var idNumber = candidate[3];
                    var voteCount = candidate[4];

                    var candidateTemplate = "<tr><th>" + id + "</th><td>" + fname + " " + lname + "</td><td>" + idNumber + "</td><td>" + voteCount + "</td></tr>";
                    candidatesResults.append(candidateTemplate);

                //     var candidateBox = `
                //     <div class="candidate-box">
                //         <h2>${fname} ${lname}</h2>
                //         <p>Party: ${idNumber}</p>
                //         <p>Votes: ${voteCount}</p>
                //     </div>
                // `;

                var candidateBox = `
                <div
                class="py-5 px-20 flex flex-col items-center justify-center bg-[#ECF1FF66] border border-[#EEF1F0]"
              >
                <div class="flex items-center justify-center gap-4">
                  🗳
  
                  <p class="font-bold text-xl">${voteCount}</p>
                </div>
                <p>${fname} ${lname}</p>
                <p>Party: ${idNumber}</p>
              </div>`;

                candidatesResultsContainer.append(candidateBox);

                    var candidateOption = "<option value='" + id + "'>" + fname + " " + lname + "</option>";
                    candidatesSelect.append(candidateOption);
                });
            }
            return electionInstance.voters(App.account);
        }).then(function (hasVoted) {
            if (hasVoted) {
                $('form').hide();
                $("#index-text").html("You are successfully logged in!");
                $("#new-candidate").html("New candidates can't be added. The election process has already started.");
                $("#vote-text").html("Vote cast successfully for candidate " + localStorage.getItem("votedForID"));
            }
            loader.hide();
            content.show();
            return electionInstance.usersCount();
        }).then(function (usersCount) {
            var voterz = $("#voterz");
            voterz.empty();
            var votedPpl = $("#votedPpl");
            votedPpl.empty();

            for (var i = 1; i <= usersCount; i++) {
                electionInstance.users(i).then(function (user) {
                    var firstName = user[0];
                    var lastName = user[1];
                    var idNumber = user[2];
                    var email = user[3];
                    var address = user[5];

                    let voterTemplate = "<tr><td>" + firstName + " " + lastName + "</td><td>" + idNumber + "</td><td>" + email + "</td><td>" + address + "</td></tr>";
                    voterz.append(voterTemplate);
                    electionInstance.voters(address).then(function (hasVoted) {
                        if (hasVoted) {
                            let votedTemplate = "<tr><td>" + firstName + " " + lastName + "</td><td>" + idNumber + "</td><td>" + email + "</td><td>" + address + "</td></tr>";
                            votedPpl.append(votedTemplate);
                        }
                    });
                });
            }

            if (localStorage.getItem("finishElection") === "1") {
                $('form').hide();
                $("#index-text").html("There is no active election ongoing at the moment");
                $("#vote-text").html("No active voting ongoing");
                $('.addCandidateForm').show();
                $('.vot').hide();
            }
        }).catch(function (error) {
            console.warn(error);
        });
        if (localStorage.getItem('userAccount')) {
            $("#index-text").html("You are successfully logged in!");
            var regForm =   $('#regForm');
            var navbar = $('#navId');
            let account = localStorage.getItem('userAccount');
            let logoutB = `
            <div class="flex items-end justify-between gap-4">
                <div class="bg-[#F2F5FE] px-3 py-1.5 rounded-md">
                <p>    Your Account: ${account.substring(0, 8)}
                </p>
                <p class="text-green-300">Logged In</p>
                </div>
                <button 
                class="p-3 bg-red-600 text-sm text-white rounded-md"
                onClick="App.logout()">Log Out
                </button>
            </div>`;
            

            navbar.append(logoutB);

            regForm.hide();
        } else {
            $("#index-text").html("Please log in to continue.");
            var regForm =   $('#regForm');
            regForm.show();
            content.show();
        }
    },

    castVote: function () {
        if (!localStorage.getItem('userAccount') || !localStorage.getItem('userEmail')) {
            alert('You must be signed in to vote.');
            return;
        }

        var candidateId = $('#candidatesSelect').val();
        App.votedForID = candidateId;
        localStorage.setItem("votedForID", candidateId);
        App.contracts.Election.deployed().then(function (instance) {
            return instance.vote(candidateId, { from: App.account });
        }).then(function (result) {
            $("#content").hide();
            $("#loader").show();

            location.href = 'results.html';
        }).catch(function (err) {
            console.error(err);
        });
    },

    addUser: async function () {
        var firstName = $('#firstName').val();
        var lastName = $('#lastName').val();
        var idNumber = $('#idNumber').val();
        var email = $('#email').val();
        var password = $('#password').val();
        var app = await App.contracts.Election.deployed();
        await app.addUser(firstName, lastName, idNumber, email, password);
        $("#content").hide();
        $("#loader").show();
        $('.vot').show();
        location.href = 'login.html';
    },

    getUserAddress:  function () {
        var address = App.account; 
        console.log("app.js" + address);
        return address;
    },

    getUserIdNumber: async function () 
    {
        
    },

    addCandidate: async function () {
        var CfirstName = $('#CfirstName').val();
        var ClastName = $('#ClastName').val();
        var CidNumber = $('#CidNumber').val();

        var app = await App.contracts.Election.deployed();
        await app.addCandidate(CfirstName, ClastName, CidNumber);
        $("#content").hide();
        $("#loader").show();

        location.href = 'admin.html';
    },

    login: async function () {
        var lidNumber = $('#lidNumber').val();
        var lpassword = $('#lpassword').val();

        var app = await App.contracts.Election.deployed();
        var usersCount = await app.usersCount();

        for (var i = 1; i <= usersCount; i++) {
            let user = await app.users(i);
            let idNumber = user[2];
            let password = user[4];

            if (lidNumber === idNumber && lpassword === password) {
                localStorage.setItem('userAccount', App.account);
                localStorage.setItem('userEmail', user[3]);
                location.href = 'results.html';
                return;
            }
        }
        alert("Incorrect login details, please try again");
    },

    startElection: function () {
        localStorage.setItem("finishElection", "0");
        location.href = 'index.html';
    },

    endElection: function () {
        localStorage.setItem("finishElection", "1");
        location.href = 'results.html';
    },

    logout: function () {
        localStorage.removeItem('userAccount');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('votedForID');
     //   App.account = '0x0';
        location.href = 'index.html';
    },

};

$(function () {
    $(window).load(function () {
        App.init();
    });
});
