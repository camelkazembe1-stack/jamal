    const carried = new URLSearchParams(location.search).get("u");
    if (carried) document.getElementById("fph-username").value = carried;
    document.getElementById("fph-btn").addEventListener("click", function () {
      
      
      document.getElementById("fph-form").style.display = "none";
      document.getElementById("message").style.display = "block";
    });
  
