
const Web3  = require('web3');
//const TruffleContract = require('truffle');
// const $ = require('jquery');
// var TruffleContract = required("truffle-contract");

class ElectionApp {
    constructor() {
        this.web3Provider = null;
        this.contracts = {};
        this.account = '0x0';
        this.hasVoted = false;
        this.votedForID = 0;
        this.finishElection = 0;
        this.mins = 0;
    }

    async init() {
        await this.initWeb3();
    }

    async initWeb3() {
        if (window.ethereum) {
            this.web3Provider = window.ethereum;
            try {
                await window.ethereum.enable();
            } catch (error) {
                console.error("User denied account access");
            }
        } else if (window.web3) {
            this.web3Provider = window.web3.currentProvider;
        } else {
            this.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
        }
        this.web3 = new Web3(this.web3Provider);
        this.web3.eth.defaultAccount = this.web3.eth.accounts[0];
        await this.initContract();
    }

    async initContract() {
        const election = await $.getJSON("Election.json");
        this.contracts.Election = TruffleContract(election);
        this.contracts.Election.setProvider(this.web3Provider);
        this.listenForEvents();
        await this.render();
    }

    listenForEvents() {
        this.contracts.Election.deployed().then((instance) => {
            instance.votedEvent({}, {
                fromBlock: 0,
                toBlock: 'latest'
            }).watch((error, event) => {
                console.log("event triggered", event);
            });
        });
    }

    async render() {
        const loader = $("#loader");
        const content = $("#content");

        loader.show();
        content.hide();

        this.web3.eth.getCoinbase((err, account) => {
            if (err === null) {
                this.account = account;
                $("#accountAddress").html("Your Account: " + account);
            }
        });

        const electionInstance = await this.contracts.Election.deployed();
        const manager = await electionInstance.manager();

        if (manager !== this.account) {
            document.querySelector('.buy-tickets').style.display = 'none';
        }

        const candidatesCount = await electionInstance.candidatesCount();
        const candidatesResults = $("#candidatesResults");
        const candidatesSelect = $('#candidatesSelect');

        candidatesResults.empty();
        candidatesSelect.empty();

        for (let i = 1; i <= candidatesCount; i++) {
            const candidate = await electionInstance.candidates(i);
            const id = candidate[0];
            const fname = candidate[1];
            const lname = candidate[2];
            const idNumber = candidate[3];
            const voteCount = candidate[4];

            const candidateTemplate = `<tr><th>${id}</th><td>${fname} ${lname}</td><td>${idNumber}</td><td>${voteCount}</td></tr>`;
            candidatesResults.append(candidateTemplate);

            const candidateOption = `<option value='${id}'>${fname} ${lname}</option>`;
            candidatesSelect.append(candidateOption);
        }

        const hasVoted = await electionInstance.voters(this.account);
        if (hasVoted) {
            $('form').hide();
            $("#index-text").html("You are successfully logged in!");
            $("#new-candidate").html("New candidates can't be added. The election process has already started.");
            $("#vote-text").html("Vote casted successfully for candidate " + localStorage.getItem("votedForID"));
        }

        loader.hide();
        content.show();

        const usersCount = await electionInstance.usersCount();
        const voterz = $("#voterz");
        voterz.empty();

        for (let i = 1; i <= usersCount; i++) {
            const user = await electionInstance.users(i);
            const firstName = user[0];
            const lastName = user[1];
            const idNumber = user[2];
            const email = user[3];
            const address = user[5];

            const voterTemplate = `<tr><td>${firstName} ${lastName}</td><td>${idNumber}</td><td>${email}</td><td>${address}</td></tr>`;
            voterz.append(voterTemplate);
        }

        if (localStorage.getItem("finishElection") === "1") {
            $('form').hide();
            $("#index-text").html("There is no active election ongoing at the moment");
            $("#vote-text").html("No active voting ongoing");
            document.querySelector('.addCandidateForm').style.display = 'block';
            document.querySelector('.vot').style.display = 'none';
        }
    }

    async castVote() {
        const candidateId = $('#candidatesSelect').val();
        this.votedForID = candidateId;
        localStorage.setItem("votedForID", candidateId);
        const instance = await this.contracts.Election.deployed();
        await instance.vote(candidateId, { from: this.account });
        $("#content").hide();
        $("#loader").show();
        location.href = 'results.html';
    }

    async addUser() {
        const firstName = $('#firstName').val();
        const lastName = $('#lastName').val();
        const idNumber = $('#idNumber').val();
        const email = $('#email').val();
        const password = $('#password').val();

        const instance = await this.contracts.Election.deployed();
        await instance.addUser(firstName, lastName, idNumber, email, password);
        $("#content").hide();
        $("#loader").show();
        document.querySelector('.vot').style.display = 'block';
        location.href = 'vote.html';
    }

    async addCandidate() {
        const CfirstName = $('#CfirstName').val();
        const ClastName = $('#ClastName').val();
        const CidNumber = $('#CidNumber').val();

        const instance = await this.contracts.Election.deployed();
        await instance.addCandidate(CfirstName, ClastName, CidNumber);
        $("#content").hide();
        $("#loader").show();
        location.href = 'admin.html';
    }

    async login() {
        const lidNumber = $('#lidNumber').val();
        const lpassword = $('#lpassword').val();

        const instance = await this.contracts.Election.deployed();
        const usersCount = await instance.usersCount();

        for (let i = 1; i <= usersCount; i++) {
            const user = await instance.users(i);
            const idNumber = user[2];
            const password = user[4];

            if (lidNumber === idNumber && lpassword === password) {
                location.href = 'results.html';
                break;
            } else {
                prompt("Incorrect login details, Please try again");
            }
        }
    }

    startElection() {
        localStorage.setItem("finishElection", "0");
        location.href = 'index.html';
    }

    endElection() {
        localStorage.setItem("finishElection", "1");
        location.href = 'results.html';
    }
}

$(window).load(() => {
    const app = new ElectionApp();
    app.init();
});

export default ElectionApp;
