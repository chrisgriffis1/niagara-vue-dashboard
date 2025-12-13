/* Auto-generated ProgramImpl Code - Enhanced for Dashboard Persistence */

import java.util.*;              /* java Predefined*/
import javax.baja.nre.util.*;    /* nre Predefined*/
import javax.baja.sys.*;         /* baja Predefined*/
import javax.baja.status.*;      /* baja Predefined*/
import javax.baja.util.*;        /* baja Predefined*/
import com.tridium.program.*;    /* program-rt Predefined*/
import javax.baja.naming.*;      /* baja User Defined*/
import javax.baja.job.*;         /* baja User Defined*/
import javax.baja.file.*;        /* baja User Defined*/
import java.io.*;                /* baja User Defined*/

public class ProgramImpl
  extends com.tridium.program.ProgramBase
{

////////////////////////////////////////////////////////////////
// Getters
////////////////////////////////////////////////////////////////

  public BOrd getDirectory() { return (BOrd)get("directory"); }
  public BString getOperation() { return (BString)get("operation"); } // "save" or "load"
  public BString getDataKey() { return (BString)get("dataKey"); } // Key for the data (e.g., "customCards")
  public BString getJsonData() { return (BString)get("jsonData"); } // JSON data to save (for save operation)
  public BString getLoadedData() { return (BString)get("loadedData"); } // Data loaded from file (for load operation)

////////////////////////////////////////////////////////////////
// Setters
////////////////////////////////////////////////////////////////

  public void setDirectory(javax.baja.naming.BOrd v) { set("directory", v); }
  public void setOperation(javax.baja.sys.BString v) { set("operation", v); }
  public void setDataKey(javax.baja.sys.BString v) { set("dataKey", v); }
  public void setJsonData(javax.baja.sys.BString v) { set("jsonData", v); }
  public void setLoadedData(javax.baja.sys.BString v) { set("loadedData", v); }

////////////////////////////////////////////////////////////////
// Program Source
////////////////////////////////////////////////////////////////

  private static final BIcon icon = BIcon.make("module://icons/x16/dollarBill.png");
    
  public BIcon getIcon() {
    return icon;
  }
  
  public void onExecute() throws Exception {
    CustomTask task = new CustomTask();
    task.submit();
  }
  
  public class CustomTask implements Runnable {
  
    private BRunnableJob job;
    
    public CustomTask() {
      job = new BRunnableJob(this);
    }
    
    public void submit() {
      job.submit(null);
    }
    
    public void run() {
      job.log().message("Started dashboard persistence task [" + Thread.currentThread().getName() + "]");
      
      try {
        // Get properties and convert to String, handling both BString and String types
        Object operationObj = get("operation");
        String operation = "save";
        if (operationObj != null) {
          if (operationObj instanceof BString) {
            operation = ((BString)operationObj).getString();
          } else {
            operation = operationObj.toString();
          }
        }
        
        Object dataKeyObj = get("dataKey");
        String dataKey = "dashboard_state";
        if (dataKeyObj != null) {
          if (dataKeyObj instanceof BString) {
            dataKey = ((BString)dataKeyObj).getString();
          } else {
            dataKey = dataKeyObj.toString();
          }
        }
        
        Object jsonDataObj = get("jsonData");
        String jsonData = "";
        if (jsonDataObj != null) {
          if (jsonDataObj instanceof BString) {
            jsonData = ((BString)jsonDataObj).getString();
          } else {
            jsonData = jsonDataObj.toString();
          }
        }
        
        BOrd directory = getDirectory();
        
        if (directory == null) {
          job.log().failed("Directory not configured");
          return;
        }
        
        // Create file name based on data key
        String fileName = "dashboard_" + dataKey + ".json";
        
        // Create location Ord to place file   
        BOrd fileOrd = BOrd.make(directory + "/" + fileName);
        
        if ("save".equals(operation)) {
          saveData(fileOrd, fileName, jsonData);
        } else if ("load".equals(operation)) {
          loadData(fileOrd, fileName);
        } else {
          job.log().failed("Unknown operation: " + operation + ". Use 'save' or 'load'");
        }
        
      } catch (Exception e) {
        job.log().failed("Error in persistence task: " + e.getMessage());
        e.printStackTrace();
      }
      
      job.log().message("Ended dashboard persistence task [" + Thread.currentThread().getName() + "]");
    }
    
    private void saveData(BOrd fileOrd, String fileName, String jsonData) {
      try {
        OrdQuery[] query = fileOrd.parse();
        FilePath filePath = (FilePath)query[query.length - 1];
        BIFile file = null;
        
        // Check if file exists
        try {
          file = (BIFile)fileOrd.get(fileOrd.resolve().getComponent());
          job.log().message("File \"" + fileName + "\" exists. Overwriting...");
        } catch(UnresolvedException ure) {
          job.log().message("Creating new file \"" + fileName + "\"");
        }
        
        // Create or get the file
        try {
          if (file == null) {
            file = BFileSystem.INSTANCE.makeFile(filePath);
          }
        } catch(IOException ioe) {
          job.log().failed("Failed creating file \"" + fileName + "\": " + ioe.getMessage());
          ioe.printStackTrace();
          return;
        }
        
        // Write JSON data to file
        FileWriter fileWriter = null;
        try {
          File localFile = BFileSystem.INSTANCE.pathToLocalFile(file.getFilePath());
          fileWriter = new FileWriter(localFile, false); // false = overwrite
          fileWriter.write(jsonData);
          job.log().message("Successfully saved data to \"" + fileName + "\"");
        } catch(IOException ioe) {
          job.log().failed("Failed writing to file \"" + fileName + "\": " + ioe.getMessage());
          ioe.printStackTrace();
        } finally {
          if(fileWriter != null) {
            try {
              fileWriter.close();
            } catch(IOException ioe) {
              job.log().failed("Error closing file writer: " + ioe.getMessage());
            }
          }
        }
        
      } catch(Exception e) {
        job.log().failed("Error in saveData: " + e.getMessage());
        e.printStackTrace();
      }
    }
    
    private void loadData(BOrd fileOrd, String fileName) {
      try {
        OrdQuery[] query = fileOrd.parse();
        FilePath filePath = (FilePath)query[query.length - 1];
        BIFile file = null;
        
        // Try to get existing file
        try {
          file = (BIFile)fileOrd.get(fileOrd.resolve().getComponent());
        } catch(UnresolvedException ure) {
          job.log().message("File \"" + fileName + "\" does not exist yet.");
          return;
        }
        
        // Read file content
        File localFile = BFileSystem.INSTANCE.pathToLocalFile(file.getFilePath());
        StringBuilder content = new StringBuilder();
        BufferedReader reader = null;
        
        try {
          reader = new BufferedReader(new FileReader(localFile));
          String line;
          while ((line = reader.readLine()) != null) {
            content.append(line).append("\n");
          }
          
          String jsonData = content.toString().trim();
          
          // Store the loaded data in a property so JavaScript can read it
          // We'll use a special property for this
          set("loadedData", BString.make(jsonData));
          
          job.log().message("Successfully loaded data from \"" + fileName + "\" (" + jsonData.length() + " characters)");
          
        } catch(IOException ioe) {
          job.log().failed("Failed reading file \"" + fileName + "\": " + ioe.getMessage());
          ioe.printStackTrace();
        } finally {
          if(reader != null) {
            try {
              reader.close();
            } catch(IOException ioe) {
              job.log().failed("Error closing file reader: " + ioe.getMessage());
            }
          }
        }
        
      } catch(Exception e) {
        job.log().failed("Error in loadData: " + e.getMessage());
        e.printStackTrace();
      }
    }
  }
}

