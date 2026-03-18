const n=`import java.awt.Rectangle;

public class ObjectVarsAsParameters {
  public static void main(String[] args) {
    go();
  }

  public static void go() {
    Rectangle r1 = new Rectangle(0, 0, 5, 5);
    System.out.println("In method go. r1 " + r1 + "\\n");

    r1.setSize(10, 15);
    System.out.println("In method go. r1 " + r1 + "\\n");

    alterPointee(r1);
    System.out.println("In method go. r1 " + r1 + "\\n");

    alterPointer(r1);
    System.out.println("In method go. r1 " + r1 + "\\n");
  }

  public static void alterPointee(Rectangle r) {
    r.setSize(20, 30);
  }

  public static void alterPointer(Rectangle r) {
    r = new Rectangle(5, 10, 30, 35);
  }
}
`;export{n as default};
