
"use client";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import data from "@/data/form_options_new.json";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import Checkbox_Section from "./checkbox_group";
import Radio_Section from "./radio_group";
import Dropdown_Section from "./dropdown_group";
import { getName, getRollNumber } from "@/lib/auth_utility";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";


export default function SMP_Form({ idTokenClaims, submitAction }) {

  const radio_sections = [
    {
      label: "Goals",
      label_id: "goals",
      options: data["goals"]
    },
    {
      label: "Domain",
      label_id: "domain",
      options: data["domains"]
    },
    {
      label: "Active Semester",
      label_id: "active_sem",
      options: data["active_sem"]
    },
  ];

  const dropdown_sections = [
    {
      label: "Branch",
      label_id: "branch",
      options: data["branch_index"].map(b => b.name),
      multiple: false
    },
  ]

  const checkbox_sections = [
    {
      label: "Languages",
      label_id: "languages",
      options: data["languages"],
    },
    {
      label: "Tech Interests",
      label_id: "tech_interests",
      options: data['tech_interests']
    },
    {
      label: "Sports Interests",
      label_id: "sports",
      options: data['sports']
    },
    {
      label: "Cultural Interests",
      label_id: "cult_interests",
      options: data['cult_interests']
    },
    {
      label: "Hobbies",
      label_id: "hobbies",
      options: data['hobbies']
    },
  ];

  const navigate = useNavigate()
  const [roll, setRoll] = useState()
  const [isFresher, setIsFresher] = useState(false)

  const radioSchemaObj = radio_sections
    .map(section => (section.label_id == 'active_sem' ? { [section.label_id]: (z.string().optional()) } : { [section.label_id]: (z.string()) }))
    .reduce((acc, curr) => ({ ...acc, ...curr }), {});
  // const dropdownSchemaObj = dropdown_sections
  //   .map(section => ({ [section.label_id]: (z.string()) }))
  //   .reduce((acc, curr) => ({ ...acc, ...curr }), {});
  const checkboxSchemaObj = checkbox_sections
    .map(section => ({ [section.label_id]: z.array(z.string()).optional() }))
    .reduce((acc, curr) => ({ ...acc, ...curr }), {});
  const formSchema = z.object({
    branch: z.string(),
    //language: z.array(z.string()),
    // ...dropdownSchemaObj,
    ...radioSchemaObj,
    ...checkboxSchemaObj,
  });
  let branch_code;
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      "branch": "Computer Science and Engineering"
    }
  });

  function onSubmit(values) {
    submitAction(values)
  }

  function onReset() {
    form.reset();
    form.clearErrors();
  }
  useEffect(() => {
    async function run() {
      const regex = /^2[3-5]0[1-3].{4}$/;
      const roll = getRollNumber(idTokenClaims)
      if (!roll) return;
      if (!regex.test(roll)) {
        // redirect to login
        console.error("Invalid user")
        navigate("/error")
      }
      setIsFresher(roll[1] == '5')
      branch_code = roll.slice(4, 6);
      console.log(branch_code)
      const branchName = data['branch_index'].filter(b => b.code.toLowerCase() == branch_code.toLowerCase())[0].name
      console.log(branchName)
      form.reset({
        branch: branchName
      });
    }
    run()
  }, [idTokenClaims])

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        onReset={onReset}
        className="space-y-8 @container"
      >
        <div className="grid grid-cols-12 gap-4">

          {dropdown_sections.map((section, idx) =>
            <Dropdown_Section key={idx} label={section.label} label_id={section.label_id} options={section.options} control={form.control} multiple={section.multiple} />
          )}

          {
            isFresher ?
              radio_sections.map((section, idx) => {
                return <Radio_Section key={idx} label={section.label} label_id={section.label_id} options={section.options} control={form.control} />
              })
              :
              radio_sections.filter(section => !(section.label_id == 'active_sem')).map((section, idx) => {
                return <Radio_Section key={idx} label={section.label} label_id={section.label_id} options={section.options} control={form.control} />
              })
          }



          {checkbox_sections.map((section, idx) =>
            <Checkbox_Section key={idx} label_id={section.label_id} label={section.label} options={section.options} control={form.control} />
          )}

          <FormField
            control={form.control}
            name="submit-button-0"
            render={({ field }) => (
              <FormItem className="col-span-12 col-start-auto flex self-end flex-col gap-2 space-y-0 items-start">
                <FormLabel className="hidden shrink-0">Submit</FormLabel>

                <div className="w-full">
                  <FormControl>
                    <Button
                      key="submit-button-0"
                      id="submit-button-0"
                      name=""
                      className="w-full text-lg tracking-wide uppercase p-6"
                      type="submit"
                      variant="default"
                    >
                      Submit
                    </Button>
                  </FormControl>

                  <FormMessage />
                </div>
              </FormItem>
            )}
          />
        </div>
      </form>
    </Form>
  );
}
