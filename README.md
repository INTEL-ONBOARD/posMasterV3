# AVOID LOGIN WITH npm run dev

when logging using **npm run dev** command, comment out these lines in **Login.jsx** or otherwise the user won't login correctly.

**from LINE:66 to LINE:8**
        if (response.data.data.email && response.data.data.token) {
          window.electronAPI.sendUserData(response.data.data.email, response.data.data._id);
        }
 