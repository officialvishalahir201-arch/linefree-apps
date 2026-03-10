import Time "mo:core/Time";
import List "mo:core/List";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Order "mo:core/Order";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  module Token {
    public func compare(a : Token, b : Token) : Order.Order {
      Nat.compare(a.tokenNumber, b.tokenNumber);
    };
  };

  public type ServiceLocation = {
    id : Nat;
    name : Text;
    category : Text;
    description : Text;
    address : Text;
    avgServiceTimeMinutes : Nat;
    currentServingToken : Nat;
    nextTokenCounter : Nat;
    isActive : Bool;
  };

  public type Token = {
    id : Nat;
    serviceId : Nat;
    tokenNumber : Nat;
    userId : Text;
    status : Text;
    createdAt : Int;
  };

  public type QueueStatus = {
    currentServingToken : Nat;
    waitingCount : Nat;
    nextTokenNumber : Nat;
  };

  public type UserProfile = {
    name : Text;
  };

  // Set up authorization system
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  let userProfiles = Map.empty<Principal, UserProfile>();

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  var nextLocationId = 1;
  var nextTokenId = 1;

  let locations = Map.empty<Nat, ServiceLocation>();
  let tokens = Map.empty<Nat, Token>();

  public query ({ caller }) func getLocations() : async [ServiceLocation] {
    let activeList = List.empty<ServiceLocation>();
    for (location in locations.values()) {
      if (location.isActive) {
        activeList.add(location);
      };
    };
    activeList.toArray();
  };

  public query ({ caller }) func getLocation(id : Nat) : async ?ServiceLocation {
    locations.get(id);
  };

  // Book a token using caller's principal as userId
  public shared ({ caller }) func bookToken(serviceId : Nat) : async Token {
    if (caller.isAnonymous()) {
      Runtime.trap("Please log in to book a token");
    };

    let userId = caller.toText();

    switch (locations.get(serviceId)) {
      case (null) { Runtime.trap("Service location not found") };
      case (?location) {
        if (not location.isActive) { Runtime.trap("Service location is not active") };

        let token : Token = {
          id = nextTokenId;
          serviceId;
          tokenNumber = location.nextTokenCounter;
          userId;
          status = "waiting";
          createdAt = Time.now();
        };

        tokens.add(token.id, token);

        let updatedLocation : ServiceLocation = {
          id = location.id;
          name = location.name;
          category = location.category;
          description = location.description;
          address = location.address;
          avgServiceTimeMinutes = location.avgServiceTimeMinutes;
          currentServingToken = location.currentServingToken;
          nextTokenCounter = location.nextTokenCounter + 1;
          isActive = location.isActive;
        };

        locations.add(serviceId, updatedLocation);
        nextTokenId += 1;
        token;
      };
    };
  };

  public query ({ caller }) func getQueueStatus(serviceId : Nat) : async QueueStatus {
    switch (locations.get(serviceId)) {
      case (null) { Runtime.trap("Service location not found") };
      case (?location) {
        var waitingCount = 0;
        for (token in tokens.values()) {
          if (token.serviceId == serviceId and token.status == "waiting") {
            waitingCount += 1;
          };
        };

        {
          currentServingToken = location.currentServingToken;
          waitingCount;
          nextTokenNumber = location.nextTokenCounter;
        };
      };
    };
  };

  // Get tokens for the calling user
  public query ({ caller }) func getUserTokens() : async [Token] {
    let userId = caller.toText();
    let userTokens = List.empty<Token>();
    for (token in tokens.values()) {
      if (token.userId == userId and token.status != "done") {
        userTokens.add(token);
      };
    };
    userTokens.toArray();
  };

  public shared ({ caller }) func advanceQueue(serviceId : Nat) : async ServiceLocation {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };

    switch (locations.get(serviceId)) {
      case (null) { Runtime.trap("Service location not found") };
      case (?location) {
        // Update currently serving token to "done"
        for ((id, token) in tokens.entries()) {
          if (token.serviceId == serviceId and token.tokenNumber == location.currentServingToken and token.status == "serving") {
            let updatedToken : Token = {
              id = token.id;
              serviceId = token.serviceId;
              tokenNumber = token.tokenNumber;
              userId = token.userId;
              status = "done";
              createdAt = token.createdAt;
            };
            tokens.add(id, updatedToken);
          };
        };

        // Find next waiting token
        var nextTokenNumber = location.currentServingToken + 1;
        var found = false;
        while (not found) {
          switch (tokens.get(nextTokenNumber)) {
            case (?nextToken) {
              if (nextToken.serviceId == serviceId and nextToken.status == "waiting") {
                found := true;
              } else {
                nextTokenNumber += 1;
              };
            };
            case (null) { found := true };
          };
        };

        // Update location with new currentServingToken
        let updatedLocation : ServiceLocation = {
          id = location.id;
          name = location.name;
          category = location.category;
          description = location.description;
          address = location.address;
          avgServiceTimeMinutes = location.avgServiceTimeMinutes;
          currentServingToken = nextTokenNumber;
          nextTokenCounter = location.nextTokenCounter;
          isActive = location.isActive;
        };

        locations.add(serviceId, updatedLocation);
        updatedLocation;
      };
    };
  };

  public shared ({ caller }) func addLocation(
    name : Text,
    category : Text,
    description : Text,
    address : Text,
    avgServiceTimeMinutes : Nat,
  ) : async ServiceLocation {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };

    let location : ServiceLocation = {
      id = nextLocationId;
      name;
      category;
      description;
      address;
      avgServiceTimeMinutes;
      currentServingToken = 0;
      nextTokenCounter = 1;
      isActive = true;
    };

    locations.add(location.id, location);
    nextLocationId += 1;
    location;
  };

  public shared ({ caller }) func updateLocation(
    id : Nat,
    name : Text,
    category : Text,
    description : Text,
    address : Text,
    avgServiceTimeMinutes : Nat,
  ) : async ServiceLocation {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };

    switch (locations.get(id)) {
      case (null) { Runtime.trap("Service location not found") };
      case (?location) {
        let updatedLocation : ServiceLocation = {
          id;
          name;
          category;
          description;
          address;
          avgServiceTimeMinutes;
          currentServingToken = location.currentServingToken;
          nextTokenCounter = location.nextTokenCounter;
          isActive = location.isActive;
        };

        locations.add(id, updatedLocation);
        updatedLocation;
      };
    };
  };

  public shared ({ caller }) func removeLocation(id : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };

    switch (locations.get(id)) {
      case (null) { Runtime.trap("Service location not found") };
      case (?location) {
        let updatedLocation : ServiceLocation = {
          id = location.id;
          name = location.name;
          category = location.category;
          description = location.description;
          address = location.address;
          avgServiceTimeMinutes = location.avgServiceTimeMinutes;
          currentServingToken = location.currentServingToken;
          nextTokenCounter = location.nextTokenCounter;
          isActive = false;
        };

        locations.add(id, updatedLocation);
      };
    };
  };

  public query ({ caller }) func getQueueList(serviceId : Nat) : async [Token] {
    let waitingTokens = List.empty<Token>();
    for (token in tokens.values()) {
      if (token.serviceId == serviceId and token.status == "waiting") {
        waitingTokens.add(token);
      };
    };
    waitingTokens.toArray().sort();
  };

  public query ({ caller }) func getToken(tokenId : Nat) : async ?Token {
    tokens.get(tokenId);
  };

  // Cancel a token (caller must own it)
  public shared ({ caller }) func cancelToken(tokenId : Nat) : async () {
    let userId = caller.toText();

    switch (tokens.get(tokenId)) {
      case (null) { Runtime.trap("Token not found") };
      case (?token) {
        if (token.userId != userId and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Only token owner can cancel");
        };
        tokens.add(
          tokenId,
          {
            id = token.id;
            serviceId = token.serviceId;
            tokenNumber = token.tokenNumber;
            userId = token.userId;
            status = "done";
            createdAt = token.createdAt;
          },
        );
      };
    };
  };
};
