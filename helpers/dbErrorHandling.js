"use strict"

//Custom error handling using database values

// Get unique error field name

const uniqueMessage = error => {
    let output;
    try{
        let fieldname = error.message.split(".$")[1]
        field = field.split(" dub key")[0]
        field = field.substring(0, field.lastIndexOf("_"))
        req.flash("errors", [{
            message: "An account with this "+field + " already exists"
        }])
        output = fieldname.charAt(0).toUpperCase() + fieldname.slice(1) + "Already Exists"
    }catch(err){
        output = "already exists"
    }
    return output
}

// Get the error message from the error object

exports.errorHandler = error => {
    let message =""
    if(error.code){
        switch(error.code){
            case 11000:
            case 11001:
                message = uniqueMessage(error)
                break
            default:
                message = "Something went wrong"
        }
    }else{
        for(let errorName in error.errorors){
            if(error.errorors[errorName].message){
                message = error.errorors[errorName].message
            }
        }
    }
    return message
}
